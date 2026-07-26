import type { ApiKey, StatusInfo, User } from "./types";

// In-memory fake backend so the UI can be previewed in a plain browser
// (`bun run dev` opened directly, without the Tauri shell). Only reachable
// in dev builds — see the IS_MOCK gate in api.ts.

// `?authed` / `?applied` in the dev URL pre-seed state, so individual screens
// can be opened (or screenshotted) directly without clicking through login.
const q = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;

let authed = q?.has("authed") ?? false;
let status: StatusInfo = q?.has("applied")
  ? { codex: "Qipaoshui", claude: "Qipaoshui", has_snapshot: true }
  : { codex: "Official", claude: "Official", has_snapshot: false };

let nextKeyId = 3;
let keys: ApiKey[] = [
  {
    id: 1,
    key: "sk-qps-demo1234567890abcdefghijklmn",
    name: "默认 Key",
    status: "enabled",
    quota: 50,
    quota_used: 12.4,
    expires_at: null,
    created_at: "2026-07-01T00:00:00Z",
  },
  {
    id: 2,
    key: "sk-qps-work0987654321zyxwvutsrqponm",
    name: "工作机",
    status: "disabled",
    quota: 20,
    quota_used: 19.2,
    expires_at: "2026-12-31T00:00:00Z",
    created_at: "2026-07-10T00:00:00Z",
  },
];

const user: User = {
  id: 1,
  email: "demo@qipaoshui.buzz",
  username: "demo",
  role: "user",
  balance: 23.5,
  status: "active",
};

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export async function mockInvoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  await delay();
  switch (cmd) {
    case "is_authenticated":
      return authed;
    case "login":
    case "register":
    case "login_2fa":
      authed = true;
      return { access_token: "mock", requires_2fa: false };
    case "logout":
      authed = false;
      return null;
    case "me":
      return user;
    case "get_public_settings":
      // `?turnstile` 让浏览器预览渲染真实的人机验证 iframe（线上 embed 页）
      return q?.has("turnstile")
        ? { turnstile_enabled: true, turnstile_site_key: "managed-by-embed-page" }
        : { turnstile_enabled: false, turnstile_site_key: "" };
    case "send_verify_code":
      return { message: "ok", countdown: 60 };
    case "list_api_keys":
      return { items: keys, total: keys.length, page: 1, page_size: 50 };
    case "create_api_key": {
      const body = (args?.body ?? {}) as { name?: string };
      const k: ApiKey = {
        id: nextKeyId++,
        key: `sk-qps-new${Math.random().toString(36).slice(2, 12)}${"x".repeat(16)}`,
        name: body.name ?? "未命名",
        status: "enabled",
        quota: 0,
        quota_used: 0,
        expires_at: null,
        created_at: new Date().toISOString(),
      };
      keys = [k, ...keys];
      return k;
    }
    case "delete_api_key":
      keys = keys.filter((k) => k.id !== args?.id);
      return null;
    case "provider_status":
      return status;
    case "apply_qipaoshui_provider":
      status = { codex: "Qipaoshui", claude: "Qipaoshui", has_snapshot: true };
      return null;
    case "restore_official_provider":
      status = { ...status, codex: "Official", claude: "Official" };
      return null;
    default:
      throw new Error(`mock: unimplemented command "${cmd}"`);
  }
}
