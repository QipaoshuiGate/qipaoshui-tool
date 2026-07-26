use crate::config::atomic::{read_json_file_opt, write_json_value};
use crate::config::paths;
use crate::error::Result;
use serde_json::{json, Value};

const ENV_KEY_BASE_URL: &str = "ANTHROPIC_BASE_URL";
const ENV_KEY_AUTH_TOKEN: &str = "ANTHROPIC_AUTH_TOKEN";

pub struct ClaudeApplyParams<'a> {
    pub base_url: &'a str, // e.g. https://qipaoshui.buzz
    pub api_key: &'a str,
}

pub fn read_settings() -> Result<Value> {
    let path = paths::claude_settings_path();
    Ok(read_json_file_opt::<Value>(&path)?.unwrap_or_else(|| json!({})))
}

pub fn is_qipaoshui_active(settings: &Value) -> bool {
    settings
        .get("env")
        .and_then(|e| e.get(ENV_KEY_BASE_URL))
        .and_then(|v| v.as_str())
        .map(|s| s.contains("qipaoshui"))
        .unwrap_or(false)
}

/// Merge env ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN into settings.json,
/// preserving all other keys. Writes atomically.
pub fn apply_qipaoshui(params: &ClaudeApplyParams<'_>) -> Result<()> {
    let path = paths::claude_settings_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut settings = read_settings()?;
    let env = settings
        .as_object_mut()
        .map(|o| {
            if !o.contains_key("env") {
                o.insert("env".into(), json!({}));
            }
            o.get_mut("env").unwrap().clone()
        })
        .unwrap_or_else(|| json!({}));

    let mut env_obj = match env {
        Value::Object(m) => m,
        _ => serde_json::Map::new(),
    };
    env_obj.insert(ENV_KEY_BASE_URL.into(), Value::String(params.base_url.into()));
    env_obj.insert(ENV_KEY_AUTH_TOKEN.into(), Value::String(params.api_key.into()));

    if let Some(o) = settings.as_object_mut() {
        o.insert("env".into(), Value::Object(env_obj));
    } else {
        let mut o = serde_json::Map::new();
        o.insert("env".into(), Value::Object(env_obj));
        settings = Value::Object(o);
    }
    write_json_value(&path, &settings)
}

/// Remove the two ANTHROPIC_* keys from env. Preserves rest of settings.json.
pub fn restore_official() -> Result<()> {
    let path = paths::claude_settings_path();
    if !path.exists() {
        return Ok(());
    }
    let mut settings = read_settings()?;
    if let Some(env) = settings.get_mut("env").and_then(|v| v.as_object_mut()) {
        env.remove(ENV_KEY_BASE_URL);
        env.remove(ENV_KEY_AUTH_TOKEN);
        if env.is_empty() {
            if let Some(o) = settings.as_object_mut() {
                o.remove("env");
            }
        }
    }
    write_json_value(&path, &settings)
}

pub struct ClaudeSnapshot {
    pub text: String, // raw settings.json text (empty if file absent)
}

pub fn snapshot_claude() -> Result<ClaudeSnapshot> {
    let path = paths::claude_settings_path();
    let text = path
        .exists()
        .then(|| std::fs::read_to_string(&path).unwrap_or_default())
        .unwrap_or_default();
    Ok(ClaudeSnapshot { text })
}

pub fn restore_claude(snap: &ClaudeSnapshot) -> Result<()> {
    use crate::config::atomic::{atomic_write, delete_file_opt};
    let path = paths::claude_settings_path();
    if snap.text.trim().is_empty() {
        delete_file_opt(&path)
    } else {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        atomic_write(&path, snap.text.as_bytes())
    }
}