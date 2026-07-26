use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("config error: {0}")]
    Config(String),

    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("toml error: {0}")]
    Toml(#[from] toml::de::Error),

    #[error("toml edit error: {0}")]
    TomlEdit(#[from] toml_edit::TomlError),

    #[error("http error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("store error: {0}")]
    Store(String),

    #[error("api error ({status}): {message}")]
    Api { status: u16, message: String },

    #[error("auth required")]
    Unauthenticated,

    #[error("{0}")]
    Other(String),
}

pub type Result<T> = std::result::Result<T, AppError>;

impl From<tauri_plugin_store::Error> for AppError {
    fn from(e: tauri_plugin_store::Error) -> Self {
        AppError::Store(e.to_string())
    }
}

impl serde::Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> std::result::Result<S::Ok, S::Error> {
        s.serialize_str(self.to_string().as_ref())
    }
}