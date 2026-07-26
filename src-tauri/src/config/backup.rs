use crate::config::{claude, codex};
use crate::config::atomic::write_json_value;
use crate::config::paths;
use crate::error::Result;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::time::SystemTime;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveSnapshot {
    pub created_at: u64, // unix seconds
    pub codex_config: String,
    pub codex_auth: String,
    pub claude_settings: String,
}

/// Take a snapshot of current live codex + claude config, persist to disk
/// (rotated, keep last 10), and return it for immediate apply/restore use.
pub fn snapshot_current() -> Result<LiveSnapshot> {
    let codex_snap = codex::snapshot_codex()?;
    let claude_snap = claude::snapshot_claude()?;

    let created_at = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let snap = LiveSnapshot {
        created_at,
        codex_config: codex_snap.config_text,
        codex_auth: codex_snap.auth_text,
        claude_settings: claude_snap.text,
    };
    persist_snapshot(&snap)?;
    Ok(snap)
}

fn persist_snapshot(snap: &LiveSnapshot) -> Result<()> {
    let dir = paths::snapshot_dir();
    fs::create_dir_all(&dir)?;
    let path = dir.join(format!("snapshot-{}.json", snap.created_at));
    write_json_value(&path, &json!(snap))?;
    rotate_snapshots(&dir, 10)
}

fn rotate_snapshots(dir: &std::path::Path, keep: usize) -> Result<()> {
    let mut entries: Vec<_> = fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_name()
                .to_string_lossy()
                .starts_with("snapshot-")
        })
        .collect();
    entries.sort_by_key(|e| e.file_name().to_string_lossy().to_string());
    while entries.len() > keep {
        let old = entries.remove(0);
        let _ = fs::remove_file(old.path());
    }
    Ok(())
}

/// Whether a snapshot captured an official (non-qipaoshui) state for both tools.
fn is_official_snapshot(snap: &LiveSnapshot) -> bool {
    if codex::is_qipaoshui_active(&snap.codex_config) {
        return false;
    }
    let claude_settings: Value =
        serde_json::from_str(&snap.claude_settings).unwrap_or(Value::Null);
    !claude::is_qipaoshui_active(&claude_settings)
}

/// Load the most recent snapshot that captured an official (non-qipaoshui)
/// state. Snapshots taken while qipaoshui was already active are skipped —
/// restoring one of those would put the qipaoshui config right back.
pub fn load_latest_official_snapshot() -> Result<Option<LiveSnapshot>> {
    let dir = paths::snapshot_dir();
    if !dir.exists() {
        return Ok(None);
    }
    let mut entries: Vec<_> = fs::read_dir(&dir)?
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name().to_string_lossy().starts_with("snapshot-"))
        .collect();
    entries.sort_by_key(|e| e.file_name().to_string_lossy().to_string());
    for entry in entries.into_iter().rev() {
        let Ok(text) = fs::read_to_string(entry.path()) else {
            continue;
        };
        let Ok(snap) = serde_json::from_str::<LiveSnapshot>(&text) else {
            continue;
        };
        if is_official_snapshot(&snap) {
            return Ok(Some(snap));
        }
    }
    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn snap(codex_config: &str, claude_settings: &str) -> LiveSnapshot {
        LiveSnapshot {
            created_at: 0,
            codex_config: codex_config.into(),
            codex_auth: String::new(),
            claude_settings: claude_settings.into(),
        }
    }

    #[test]
    fn clean_snapshot_is_official() {
        assert!(is_official_snapshot(&snap("model = \"o3\"", "{\"env\":{}}")));
        assert!(is_official_snapshot(&snap("", "")));
    }

    #[test]
    fn codex_qipaoshui_snapshot_is_not_official() {
        assert!(!is_official_snapshot(&snap(
            "model_provider = \"qipaoshui\"",
            "{}"
        )));
    }

    #[test]
    fn claude_qipaoshui_snapshot_is_not_official() {
        assert!(!is_official_snapshot(&snap(
            "",
            "{\"env\":{\"ANTHROPIC_BASE_URL\":\"https://qipaoshui.buzz\"}}"
        )));
    }
}

/// Restore codex + claude from a snapshot.
pub fn restore_from_snapshot(snap: &LiveSnapshot) -> Result<()> {
    let codex_snap = codex::CodexSnapshot {
        config_text: snap.codex_config.clone(),
        auth_text: snap.codex_auth.clone(),
    };
    codex::restore_codex(&codex_snap)?;
    let claude_snap = claude::ClaudeSnapshot {
        text: snap.claude_settings.clone(),
    };
    claude::restore_claude(&claude_snap)?;
    Ok(())
}