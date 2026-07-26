use std::path::PathBuf;

/// Home directory. Falls back gracefully on Windows via `dirs::home_dir` which
/// uses SHGetKnownFolderPath.
pub fn home_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from("."))
}

/// ~/.codex (or %USERPROFILE%\.codex)
pub fn codex_dir() -> PathBuf {
    home_dir().join(".codex")
}

pub fn codex_config_path() -> PathBuf {
    codex_dir().join("config.toml")
}

pub fn codex_auth_path() -> PathBuf {
    codex_dir().join("auth.json")
}

/// ~/.claude
pub fn claude_dir() -> PathBuf {
    home_dir().join(".claude")
}

pub fn claude_settings_path() -> PathBuf {
    claude_dir().join("settings.json")
}

/// ~/.qipaoshui-tool — app data (token cache, snapshots)
pub fn app_data_dir() -> PathBuf {
    home_dir().join(".qipaoshui-tool")
}

pub fn snapshot_dir() -> PathBuf {
    app_data_dir().join("snapshots")
}