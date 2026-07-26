# qipaoshui-tool

Qipaoshui sub2api desktop tool, built with Tauri 2, React 19, TypeScript, and Tailwind.

## Install

Grab the installer for your platform from the [Releases page](https://github.com/QipaoshuiGate/qipaoshui-tool/releases):

- **macOS**: `.dmg` — `aarch64` for Apple Silicon, `x64` for Intel
- **Windows**: `.msi` or `-setup.exe`
- **Linux**: `.deb`, `.rpm`, or `.AppImage`

### Permanent download links

Every release also carries a copy of each installer under a version-less name,
so these links always resolve to the newest release and never need updating —
use them when linking from docs or a website:

| Platform | Link |
| :--- | :--- |
| macOS (Apple Silicon) | `https://github.com/QipaoshuiGate/qipaoshui-tool/releases/latest/download/qipaoshui-tool-macos-aarch64.dmg` |
| macOS (Intel) | `https://github.com/QipaoshuiGate/qipaoshui-tool/releases/latest/download/qipaoshui-tool-macos-x64.dmg` |
| Windows (setup) | `https://github.com/QipaoshuiGate/qipaoshui-tool/releases/latest/download/qipaoshui-tool-windows-x64-setup.exe` |
| Windows (MSI) | `https://github.com/QipaoshuiGate/qipaoshui-tool/releases/latest/download/qipaoshui-tool-windows-x64.msi` |
| Linux (deb) | `https://github.com/QipaoshuiGate/qipaoshui-tool/releases/latest/download/qipaoshui-tool-linux-amd64.deb` |
| Linux (rpm) | `https://github.com/QipaoshuiGate/qipaoshui-tool/releases/latest/download/qipaoshui-tool-linux-x86_64.rpm` |
| Linux (AppImage) | `https://github.com/QipaoshuiGate/qipaoshui-tool/releases/latest/download/qipaoshui-tool-linux-amd64.AppImage` |

The version-stamped filenames remain available too; pin to those when you need
a specific version.

### macOS first launch

Builds are not notarized by Apple yet, so macOS warns about an unverified
developer on first launch. Either approve the app under
**System Settings → Privacy & Security → "Open Anyway"**, or clear the
quarantine flag in a terminal:

```sh
xattr -cr /Applications/qipaoshui-tool.app
```

## Development

Requires [Bun](https://bun.sh) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) (Rust toolchain and platform system libraries).

```sh
bun install
bun tauri dev
```

Rust tests live in `src-tauri`:

```sh
cargo test --manifest-path src-tauri/Cargo.toml
```

## CI / Releases

- Every push runs [CI](.github/workflows/ci.yml): frontend typecheck + build, and Rust tests.
- Pushing a `v*` tag runs the [release workflow](.github/workflows/release.yml): tests gate a
  4-platform build (macOS arm64/x64, Linux, Windows) via `tauri-action`, which uploads the
  installers to a **draft** GitHub release — review it, then publish.

To cut a release: bump `version` in `src-tauri/tauri.conf.json` and `package.json`, commit, then:

```sh
git tag vX.Y.Z && git push origin vX.Y.Z
```
