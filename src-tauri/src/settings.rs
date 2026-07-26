use crate::error::Result;
use crate::http_client::HttpState;
use reqwest::Method;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct PublicSettings {
    #[serde(default)]
    pub turnstile_enabled: bool,
    #[serde(default)]
    pub turnstile_site_key: String,
}

pub async fn get_public_settings(state: &HttpState) -> Result<PublicSettings> {
    state.request_anon::<PublicSettings>(Method::GET, "/api/v1/settings/public", None).await
}