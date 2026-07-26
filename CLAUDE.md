# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

气泡水 (qipaoshui-tool): a Tauri 2 desktop client for the qipaoshui.buzz sub2api service. It handles account auth and API-key management against that service, and provides a one-click switch that points local AI CLI tools — OpenAI Codex CLI (`~/.codex`) and Claude Code (`~/.claude`) — at qipaoshui instead of their official backends, with snapshot/restore. React 19 + TypeScript + Tailwind frontend, Rust backend, Bun as package manager.

## Commands

```sh
bun install                                     # deps
bun tauri dev                                   # full desktop app (Vite on :1420 + Rust)
bun run dev                                     # frontend alone in a browser → mock mode (see below)
bun run build                                   # tsc typecheck + vite build (the frontend CI check)
cargo test --manifest-path src-tauri/Cargo.toml # all Rust tests (the only tests in the repo)
cargo test --manifest-path src-tauri/Cargo.toml config::codex  # one module's tests
bun tauri build                                 # release bundle for the host platform
```

Gotcha: compiling the Rust crate at all (including `cargo test`) fails unless `dist/` exists, because `tauri::generate_context!` validates `frontendDist`. Run `bun run build` once first (CI does exactly this).

## Architecture

The two halves talk only through Tauri commands: registered in [src-tauri/src/lib.rs](src-tauri/src/lib.rs), mirrored 1:1 by the `api` object in [src/lib/api.ts](src/lib/api.ts). Add a command in both places (snake_case command, camelCase args auto-convert).

**Remote API client (Rust).** `http_client.rs` owns `HttpState`: a reqwest client plus token persistence via tauri-plugin-store (`auth.json` in app data). All requests hit the hardcoded `BASE_URL` (https://qipaoshui.buzz). Responses use a `{code, message, data}` envelope — `parse()` unwraps `data` and treats `code != 0` as an error even on HTTP 200. On 401 it refreshes the token once and retries. `auth.rs` / `api_keys.rs` / `settings.rs` are thin endpoint wrappers over it.

**Provider switching (Rust — the delicate part).** `provider.rs` orchestrates `config/` to flip both CLIs between official and qipaoshui:

- `codex.rs` edits `~/.codex/config.toml` via `toml_edit` (format/key preserving): sets top-level `model`, `model_provider = "qipaoshui"`, and a `[model_providers.qipaoshui]` table; sets `OPENAI_API_KEY` in `~/.codex/auth.json` while preserving ChatGPT login material. Active marker: `model_provider = "qipaoshui"`.
- `claude.rs` merges/removes `env.ANTHROPIC_BASE_URL` + `env.ANTHROPIC_AUTH_TOKEN` in `~/.claude/settings.json`. Active marker: base URL contains "qipaoshui".
- `backup.rs` snapshots both configs to `~/.qipaoshui-tool/snapshots/` (rotated, keep 10). Restore uses the newest snapshot that captured an *official* state.
- `atomic.rs`: every config write goes through tmp-file + rename; JSON is written with sorted keys.

Invariants to preserve when touching this code:

- Never snapshot while qipaoshui is already active — rotation would eventually evict the real official snapshot (see the guard in `apply_qipaoshui` and the filter in `load_latest_official_snapshot`).
- These are the user's live `~/.codex` and `~/.claude` configs. Mutations must stay merge-based (preserve unrelated keys/formatting); full-file writes are only allowed when restoring a snapshot.
- The unit tests in `codex.rs` and `backup.rs` encode exactly these invariants — extend them when changing apply/strip/snapshot logic.

**Frontend.** No router: the current page is a field in the zustand store ([src/lib/store.ts](src/lib/store.ts)); [App.tsx](src/App.tsx) switches between `AuthPage`, `Dashboard`, and `KeysPage`. Server state goes through TanStack Query. When the frontend runs in a plain browser without Tauri, `IS_MOCK` in `api.ts` routes every command to [src/lib/mock.ts](src/lib/mock.ts) with fake data (`?page=keys` deep-links a screen; `?turnstile` enables the captcha iframe) — useful for UI work without the Rust side. UI copy is Chinese.

**Turnstile (cross-repo contract).** Cloudflare Turnstile cannot run on the packaged app's `tauri://localhost` origin, so [Turnstile.tsx](src/components/Turnstile.tsx) iframes `https://qipaoshui.buzz/turnstile/embed` — a frame-exempt page served by the qipaoshui server (BurstWhite/qipaoshui, `backend/internal/handler/turnstile_embed_handler.go`) that runs the widget on the allowlisted https origin and posts `{source: "qipaoshui-turnstile", event: ready|token|expired|error}` back via postMessage. Changing the message shape or path breaks the other side.

## CI / Releases

[ci.yml](.github/workflows/ci.yml) runs on every push: frontend typecheck+build, and `cargo test` on Linux. Pushing a `v*` tag runs [release.yml](.github/workflows/release.yml): the CI jobs gate a 4-platform `tauri-action` build (macOS arm64/x64, Linux, Windows) that uploads installers to a **draft** GitHub release — publish manually after review.

- The version lives in both `src-tauri/tauri.conf.json` and `package.json`; keep them in sync and matching the tag (`0.1.0` ↔ `v0.1.0`).
- macOS bundles are ad-hoc signed via `bundle.macOS.signingIdentity: "-"` in `tauri.conf.json`. Do not remove it: without a bundle-level signature, quarantined downloads fail with a dead-end "damaged" dialog instead of the approvable unverified-developer flow. Real Developer ID signing/notarization env vars are scaffolded (commented) in release.yml.
