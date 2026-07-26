use crate::config::{atomic, backup, claude, codex, paths};
use crate::error::Result;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ApplyParams {
    pub api_key: String,
    pub base_url: String,        // for codex: with /v1 ; for claude: bare host
    pub claude_base_url: String, // for claude code (bare host)
    pub model: String,
    pub wire_api: String, // "responses" | "chat"
    pub context_window: Option<u64>,
}

#[derive(Serialize, Deserialize)]
pub enum ActiveStatus {
    Official,
    Qipaoshui,
    Unknown,
}

#[derive(Serialize, Deserialize)]
pub struct StatusInfo {
    pub codex: ActiveStatus,
    pub claude: ActiveStatus,
    pub has_snapshot: bool,
}

/// Snapshot current live config, then apply qipaoshui to both codex & claude.
pub fn apply_qipaoshui(params: &ApplyParams) -> Result<()> {
    // Only snapshot a clean official state. Re-applying while qipaoshui is
    // already active would snapshot the qipaoshui config itself, and rotation
    // would eventually push the real official snapshot out entirely.
    let codex_text = codex::read_codex_config_text()?;
    let claude_settings = claude::read_settings()?;
    if !codex::is_qipaoshui_active(&codex_text) && !claude::is_qipaoshui_active(&claude_settings) {
        backup::snapshot_current()?;
    }

    let codex_params = codex::CodexApplyParams {
        base_url: &params.base_url,
        api_key: &params.api_key,
        model: &params.model,
        wire_api: &params.wire_api,
        context_window: params.context_window,
    };
    codex::write_codex_live_atomic(&codex_params)?;

    let claude_params = claude::ClaudeApplyParams {
        base_url: &params.claude_base_url,
        api_key: &params.api_key,
    };
    claude::apply_qipaoshui(&claude_params)?;
    Ok(())
}

/// Restore the official config that was live before qipaoshui was applied.
pub fn restore_official() -> Result<()> {
    match backup::load_latest_official_snapshot()? {
        Some(snap) => backup::restore_from_snapshot(&snap),
        None => {
            // No official snapshot: best-effort strip of qipaoshui config.
            let codex_text = codex::read_codex_config_text()?;
            let codex_was_active = codex::is_qipaoshui_active(&codex_text);
            let stripped = codex::remove_qipaoshui_provider(&codex_text)?;
            atomic::write_text_file(&paths::codex_config_path(), &stripped)?;
            if codex_was_active {
                codex::remove_codex_api_key()?;
            }
            claude::restore_official()?;
            Ok(())
        }
    }
}

pub fn current_status() -> Result<StatusInfo> {
    let codex_text = codex::read_codex_config_text()?;
    let codex_status = if codex::is_qipaoshui_active(&codex_text) {
        ActiveStatus::Qipaoshui
    } else if codex_text.trim().is_empty() {
        ActiveStatus::Unknown
    } else {
        ActiveStatus::Official
    };
    let claude_settings = claude::read_settings()?;
    let claude_status = if claude::is_qipaoshui_active(&claude_settings) {
        ActiveStatus::Qipaoshui
    } else if claude_settings.is_null() {
        ActiveStatus::Unknown
    } else {
        ActiveStatus::Official
    };
    let has_snapshot = backup::load_latest_official_snapshot()?.is_some();
    Ok(StatusInfo { codex: codex_status, claude: claude_status, has_snapshot })
}