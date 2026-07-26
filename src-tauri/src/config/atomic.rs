use crate::error::{AppError, Result};
use serde::Serialize;
use serde::de::DeserializeOwned;
use std::fs;
use std::path::Path;

/// Atomically write `data` to `path`: write temp file in same dir, then fs::rename.
/// Same parent dir so rename is atomic on POSIX and Windows (same volume).
pub fn atomic_write(path: &Path, data: &[u8]) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let parent = path.parent().ok_or_else(|| AppError::Config("invalid path".into()))?;
    let tmp = parent.join(format!(
        ".{}.tmp",
        path.file_name().and_then(|n| n.to_str()).unwrap_or("tmp")
    ));
    fs::write(&tmp, data)?;
    fs::rename(&tmp, path)?;
    Ok(())
}

pub fn write_text_file(path: &Path, data: &str) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    atomic_write(path, data.as_bytes())
}

/// Write JSON with sorted keys for deterministic output (matches cc-switch).
pub fn write_json_file<T: Serialize>(path: &Path, data: &T) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let value = serde_json::to_value(data)?;
    let sorted = sort_json_keys(value);
    let json = serde_json::to_string_pretty(&sorted)?;
    atomic_write(path, json.as_bytes())
}

pub fn write_json_value(path: &Path, value: &serde_json::Value) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let sorted = sort_json_keys(value.clone());
    let json = serde_json::to_string_pretty(&sorted)?;
    atomic_write(path, json.as_bytes())
}

pub fn read_text_file_opt(path: &Path) -> Result<String> {
    if path.exists() {
        Ok(fs::read_to_string(path)?)
    } else {
        Ok(String::new())
    }
}

pub fn read_json_file_opt<T: DeserializeOwned>(path: &Path) -> Result<Option<T>> {
    if !path.exists() {
        return Ok(None);
    }
    let text = fs::read_to_string(path)?;
    if text.trim().is_empty() {
        return Ok(None);
    }
    Ok(Some(serde_json::from_str(&text)?))
}

pub fn delete_file_opt(path: &Path) -> Result<()> {
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

fn sort_json_keys(value: serde_json::Value) -> serde_json::Value {
    use serde_json::{Map, Value};
    match value {
        Value::Object(map) => {
            let mut sorted = Map::new();
            let mut keys: Vec<_> = map.keys().collect();
            keys.sort();
            for k in keys {
                sorted.insert(k.clone(), sort_json_keys(map[k].clone()));
            }
            Value::Object(sorted)
        }
        Value::Array(arr) => Value::Array(arr.into_iter().map(sort_json_keys).collect()),
        other => other,
    }
}