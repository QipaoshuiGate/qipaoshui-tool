use crate::error::Result;
use crate::http_client::HttpState;
use reqwest::Method;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ApiKey {
    pub id: i64,
    pub key: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group_id: Option<i64>,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub quota: f64,
    #[serde(default)]
    pub quota_used: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,
    #[serde(default)]
    pub created_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct Paginated {
    #[serde(default, alias = "data")]
    pub items: Vec<ApiKey>,
    #[serde(default)]
    pub total: i64,
    #[serde(default)]
    pub page: i64,
    #[serde(default)]
    pub page_size: i64,
}

#[derive(Serialize, Deserialize)]
pub struct CreateBody {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quota: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_in_days: Option<i64>,
}

#[derive(Serialize, Deserialize)]
pub struct UpdateBody {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quota: Option<f64>,
}

pub async fn list(state: &HttpState, page: i64, page_size: i64) -> Result<Paginated> {
    let path = format!("/api/v1/keys?page={page}&page_size={page_size}");
    state.request::<Paginated>(Method::GET, &path, None).await
}

pub async fn create(state: &HttpState, body: CreateBody) -> Result<ApiKey> {
    state.request(Method::POST, "/api/v1/keys", Some(serde_json::to_value(&body)?)).await
}

pub async fn update(state: &HttpState, id: i64, body: UpdateBody) -> Result<ApiKey> {
    let path = format!("/api/v1/keys/{id}");
    state.request(Method::PUT, &path, Some(serde_json::to_value(&body)?)).await
}

pub async fn delete(state: &HttpState, id: i64) -> Result<()> {
    let path = format!("/api/v1/keys/{id}");
    let _: serde_json::Value = state.request(Method::DELETE, &path, None).await?;
    Ok(())
}