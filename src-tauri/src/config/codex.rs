use crate::config::atomic::{atomic_write, delete_file_opt, read_text_file_opt, write_text_file};
use crate::config::paths;
use crate::error::{AppError, Result};
use serde_json::{json, Value};
use std::fs;
use std::path::Path;
use toml_edit::DocumentMut;

const QIPAOSHUI_PROVIDER_ID: &str = "qipaoshui";

/// Read ~/.codex/config.toml text (empty string if missing).
pub fn read_codex_config_text() -> Result<String> {
    read_text_file_opt(&paths::codex_config_path())
}

pub fn read_codex_auth() -> Result<Value> {
    let path = paths::codex_auth_path();
    if !path.exists() {
        return Ok(json!({}));
    }
    let text = fs::read_to_string(&path)?;
    if text.trim().is_empty() {
        return Ok(json!({}));
    }
    Ok(serde_json::from_str(&text)?)
}

/// Whether the live codex config currently routes to the qipaoshui provider.
pub fn is_qipaoshui_active(config_text: &str) -> bool {
    let Ok(doc) = config_text.parse::<DocumentMut>() else {
        return false;
    };
    doc.get("model_provider")
        .and_then(|v| v.as_str())
        .map(|s| s == QIPAOSHUI_PROVIDER_ID)
        .unwrap_or(false)
}

/// Extract active base_url from config.toml (active provider then top-level).
pub fn extract_codex_base_url(config_text: &str) -> Option<String> {
    let doc = config_text.parse::<toml::Value>().ok()?;
    if let Some(active) = doc.get("model_provider").and_then(|v| v.as_str()) {
        if let Some(b) = doc
            .get("model_providers")
            .and_then(|p| p.get(active))
            .and_then(|p| p.get("base_url"))
            .and_then(|v| v.as_str())
        {
            return Some(b.to_string());
        }
    }
    doc.get("base_url").and_then(|v| v.as_str()).map(|s| s.to_string())
}

/// Params for writing qipaoshui provider into codex live config.
pub struct CodexApplyParams<'a> {
    pub base_url: &'a str, // e.g. https://qipaoshui.buzz/v1
    pub api_key: &'a str,
    pub model: &'a str,           // e.g. gpt-5.5
    pub wire_api: &'a str,        // "responses" | "chat"
    pub context_window: Option<u64>,
}

/// Write auth.json with qipaoshui API key, preserving any existing OAuth login
/// material (so ChatGPT login isn't destroyed). We only set OPENAI_API_KEY and
/// keep other keys untouched.
pub fn write_codex_live_atomic(params: &CodexApplyParams<'_>) -> Result<()> {
    let config_path = paths::codex_config_path();
    let auth_path = paths::codex_auth_path();

    if let Some(parent) = auth_path.parent() {
        fs::create_dir_all(parent)?;
    }

    // Build new config.toml text from existing (merge) for format-preserving write.
    let existing = read_codex_config_text()?;
    let new_config_text = build_codex_config_text(&existing, params)?;

    // Build new auth.json: preserve existing keys, set OPENAI_API_KEY.
    let mut auth = read_codex_auth()?;
    if let Some(obj) = auth.as_object_mut() {
        obj.insert("OPENAI_API_KEY".into(), Value::String(params.api_key.to_string()));
    } else {
        let mut obj = serde_json::Map::new();
        obj.insert("OPENAI_API_KEY".into(), Value::String(params.api_key.to_string()));
        auth = Value::Object(obj);
    }

    // Validate TOML before writing.
    toml::from_str::<toml::Table>(&new_config_text)
        .map_err(|e| AppError::Config(format!("invalid generated toml: {e}")))?;

    // Paired atomic write: write auth first, then config; rollback auth on failure.
    let old_auth = if auth_path.exists() {
        Some(fs::read(&auth_path)?)
    } else {
        None
    };

    write_json_to_path(&auth_path, &auth);

    if let Err(e) = write_text_file(&config_path, &new_config_text) {
        // rollback auth
        if let Some(bytes) = old_auth {
            let _ = atomic_write(&auth_path, &bytes);
        } else {
            let _ = delete_file_opt(&auth_path);
        }
        return Err(e);
    }

    Ok(())
}

fn write_json_to_path(path: &Path, value: &Value) {
    // best-effort; the paired-atomic guarantees are enforced above
    if let Ok(s) = serde_json::to_string_pretty(value) {
        let _ = atomic_write(path, s.as_bytes());
    }
}

/// Merge qipaoshui provider section into existing config.toml text, set
/// model_provider + model. Preserves other keys/sections.
fn build_codex_config_text(
    existing: &str,
    params: &CodexApplyParams<'_>,
) -> Result<String> {
    let mut doc: DocumentMut = if existing.trim().is_empty() {
        DocumentMut::new()
    } else {
        existing.parse::<DocumentMut>().map_err(AppError::from)?
    };

    // top-level model
    doc["model"] = toml_edit::value(params.model);
    // top-level model_provider
    doc["model_provider"] = toml_edit::value(QIPAOSHUI_PROVIDER_ID);
    // optional context window
    if let Some(cw) = params.context_window {
        doc["model_context_window"] = toml_edit::value(cw as i64);
    }

    // ensure [model_providers.qipaoshui]
    // Note: toml_edit needs a table entry; create if absent.
    if !doc.contains_key("model_providers") {
        doc["model_providers"] = toml_edit::table();
    }
    let providers = doc["model_providers"].as_table_mut().unwrap();
    // remove and re-add to ensure clean section
    providers.remove(QIPAOSHUI_PROVIDER_ID);
    let mut tbl = toml_edit::Table::new();
    tbl["name"] = toml_edit::value("Qipaoshui");
    tbl["base_url"] = toml_edit::value(params.base_url);
    tbl["wire_api"] = toml_edit::value(params.wire_api);
    tbl["experimental_bearer_token"] = toml_edit::value(params.api_key);
    // Required for image generation with GPT 5.6-series models (qipaoshui-docs
    // FAQ). Both keys must live inside the provider section, not top-level.
    tbl["requires_openai_auth"] = toml_edit::value(false);
    let mut headers = toml_edit::InlineTable::new();
    headers.insert("x-openai-actor-authorization", "local-image-extension".into());
    tbl["http_headers"] = toml_edit::value(headers);
    providers.insert(QIPAOSHUI_PROVIDER_ID, toml_edit::Item::Table(tbl));

    Ok(doc.to_string())
}

/// Snapshot codex live config (config.toml + auth.json) for restore.
pub struct CodexSnapshot {
    pub config_text: String,
    pub auth_text: String, // raw json text
}

pub fn snapshot_codex() -> Result<CodexSnapshot> {
    let config_text = read_codex_config_text()?;
    let auth_text = paths::codex_auth_path()
        .exists()
        .then(|| fs::read_to_string(&paths::codex_auth_path()).unwrap_or_default())
        .unwrap_or_default();
    Ok(CodexSnapshot { config_text, auth_text })
}

/// Restore codex live config from a snapshot. auth_text empty => delete auth.json.
pub fn restore_codex(snap: &CodexSnapshot) -> Result<()> {
    let config_path = paths::codex_config_path();
    let auth_path = paths::codex_auth_path();
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)?;
    }
    write_text_file(&config_path, &snap.config_text)?;
    if snap.auth_text.trim().is_empty() {
        delete_file_opt(&auth_path)?;
    } else {
        let s = &snap.auth_text;
        atomic_write(&auth_path, s.as_bytes())?;
    }
    Ok(())
}

/// Forget the qipaoshui provider entry (used when restoring official by just
/// removing the third-party section rather than full snapshot restore).
pub fn remove_qipaoshui_provider(config_text: &str) -> Result<String> {
    let mut doc: DocumentMut = if config_text.trim().is_empty() {
        DocumentMut::new()
    } else {
        config_text.parse::<DocumentMut>()?
    };
    if let Some(providers) = doc.get_mut("model_providers").and_then(|t| t.as_table_mut()) {
        providers.remove(QIPAOSHUI_PROVIDER_ID);
    }
    if doc.get("model_provider").and_then(|v| v.as_str()) == Some(QIPAOSHUI_PROVIDER_ID) {
        doc.remove("model_provider");
        // apply always sets top-level `model` together with `model_provider`;
        // a qipaoshui model id is meaningless on the official provider.
        doc.remove("model");
    }
    Ok(doc.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    const OFFICIAL: &str = "approval_policy = \"on-request\"\nmodel_reasoning_effort = \"high\"\n";

    fn applied(existing: &str) -> String {
        build_codex_config_text(
            existing,
            &CodexApplyParams {
                base_url: "https://qipaoshui.buzz/v1",
                api_key: "sk-test",
                model: "gpt-5.5",
                wire_api: "responses",
                context_window: None,
            },
        )
        .unwrap()
    }

    #[test]
    fn apply_marks_active() {
        assert!(!is_qipaoshui_active(OFFICIAL));
        assert!(is_qipaoshui_active(&applied(OFFICIAL)));
    }

    #[test]
    fn apply_includes_gpt56_image_generation_fix() {
        let doc: toml::Value = applied(OFFICIAL).parse().unwrap();
        let provider = &doc["model_providers"][QIPAOSHUI_PROVIDER_ID];
        assert_eq!(provider["requires_openai_auth"].as_bool(), Some(false));
        assert_eq!(
            provider["http_headers"]["x-openai-actor-authorization"].as_str(),
            Some("local-image-extension")
        );
        // must be inside the provider section only, never top-level
        assert!(doc.get("requires_openai_auth").is_none());
        assert!(doc.get("http_headers").is_none());
    }

    #[test]
    fn strip_removes_provider_model_and_section() {
        let stripped = remove_qipaoshui_provider(&applied(OFFICIAL)).unwrap();
        assert!(!is_qipaoshui_active(&stripped));
        assert!(!stripped.contains("qipaoshui"));
        assert!(!stripped.contains("model_provider = "));
        assert!(!stripped.contains("model = "));
        // pre-existing official keys survive
        assert!(stripped.contains("approval_policy = \"on-request\""));
        assert!(stripped.contains("model_reasoning_effort = \"high\""));
    }

    #[test]
    fn strip_keeps_user_model_when_other_provider_active() {
        let text = "model = \"my-model\"\nmodel_provider = \"other\"\n";
        let stripped = remove_qipaoshui_provider(text).unwrap();
        assert!(stripped.contains("model = \"my-model\""));
        assert!(stripped.contains("model_provider = \"other\""));
    }

    #[test]
    fn strip_on_empty_config_is_noop() {
        assert_eq!(remove_qipaoshui_provider("").unwrap(), "");
    }
}

/// Drop the OPENAI_API_KEY that apply wrote into auth.json, preserving any
/// OAuth login material. Deletes auth.json if nothing else is left in it.
pub fn remove_codex_api_key() -> Result<()> {
    let path = paths::codex_auth_path();
    if !path.exists() {
        return Ok(());
    }
    let mut auth = read_codex_auth()?;
    let Some(obj) = auth.as_object_mut() else {
        return Ok(());
    };
    if obj.remove("OPENAI_API_KEY").is_none() {
        return Ok(());
    }
    if obj.is_empty() {
        return delete_file_opt(&path);
    }
    let text = serde_json::to_string_pretty(&auth)?;
    atomic_write(&path, text.as_bytes())
}