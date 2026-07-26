use crate::error::{AppError, Result};
use reqwest::{Client, Method, Response};
use serde::{de::DeserializeOwned, Deserialize};
use std::sync::Arc;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const BASE_URL: &str = "https://qipaoshui.buzz";
const STORE_FILE: &str = "auth.json";

#[derive(Clone)]
pub struct HttpState {
    pub client: Client,
    pub app: AppHandle,
}

impl HttpState {
    pub fn new(app: AppHandle) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("reqwest client");
        Self { client, app }
    }

    fn store(&self) -> Result<std::sync::Arc<tauri_plugin_store::Store<tauri::Wry>>> {
        Ok(self.app.store(STORE_FILE)?)
    }

    pub fn get_access_token(&self) -> Option<String> {
        let store = self.store().ok()?;
        store.get("access_token").and_then(|v| v.as_str().map(String::from))
    }

    pub fn get_refresh_token(&self) -> Option<String> {
        let store = self.store().ok()?;
        store.get("refresh_token").and_then(|v| v.as_str().map(String::from))
    }

    pub fn set_tokens(&self, access: &str, refresh: Option<&str>) -> Result<()> {
        let store = self.store()?;
        store.set("access_token", serde_json::Value::String(access.into()));
        if let Some(r) = refresh {
            store.set("refresh_token", serde_json::Value::String(r.into()));
        }
        store.save()?;
        Ok(())
    }

    pub fn clear_tokens(&self) -> Result<()> {
        let store = self.store()?;
        store.delete("access_token");
        store.delete("refresh_token");
        store.save()?;
        Ok(())
    }

    /// Issue an authenticated request. On 401, attempt one refresh and retry.
    pub async fn request<T: DeserializeOwned>(
        &self,
        method: Method,
        path: &str,
        body: Option<serde_json::Value>,
    ) -> Result<T> {
        let url = format!("{BASE_URL}{path}");
        let res = self.send(&method, &url, body.clone(), true).await?;
        if res.status().as_u16() == 401 {
            self.refresh_once().await?;
            let res = self.send(&method, &url, body, true).await?;
            return self.parse(res).await;
        }
        self.parse(res).await
    }

    /// Unauthenticated request (for login/register/refresh).
    pub async fn request_anon<T: DeserializeOwned>(
        &self,
        method: Method,
        path: &str,
        body: Option<serde_json::Value>,
    ) -> Result<T> {
        let url = format!("{BASE_URL}{path}");
        let res = self.send(&method, &url, body, false).await?;
        self.parse(res).await
    }

    async fn send(
        &self,
        method: &Method,
        url: &str,
        body: Option<serde_json::Value>,
        auth: bool,
    ) -> Result<Response> {
        let mut req = self.client.request(method.clone(), url);
        if auth {
            if let Some(tok) = self.get_access_token() {
                req = req.bearer_auth(tok);
            }
        }
        if let Some(b) = body {
            req = req.json(&b);
        }
        Ok(req.send().await?)
    }

    async fn parse<T: DeserializeOwned>(&self, res: Response) -> Result<T> {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        let val: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::Value::Null);

        // Envelope: {"code":0,"message":"success","data":...} on success;
        // {"code":4xx,"message":"...","reason":"..."} on error.
        let code_is_error = val
            .get("code")
            .and_then(|c| c.as_i64())
            .map(|c| c != 0)
            .unwrap_or(false);
        if !status.is_success() || code_is_error {
            let message = val
                .get("message")
                .or_else(|| val.get("error"))
                .and_then(|m| m.as_str())
                .map(String::from)
                .unwrap_or_else(|| text.clone());
            let reason = val.get("reason").and_then(|r| r.as_str()).map(String::from);
            let display = match reason {
                Some(r) if !r.is_empty() => format!("{message} ({r})"),
                _ => format!("{message}"),
            };
            return Err(AppError::Api { status: status.as_u16(), message: display });
        }

        // Success: unwrap envelope when it carries a "data" field; otherwise use the body as-is.
        if let Some(data) = val.get("data") {
            if data.is_null() {
                serde_json::from_str("{}").map_err(Into::into)
            } else {
                serde_json::from_value(data.clone()).map_err(Into::into)
            }
        } else if val.is_null() {
            serde_json::from_str("{}").map_err(Into::into)
        } else {
            serde_json::from_value(val).map_err(Into::into)
        }
    }

    /// Refresh tokens using stored refresh_token; store new pair.
    pub async fn refresh_once(&self) -> Result<()> {
        let Some(refresh) = self.get_refresh_token() else {
            return Err(AppError::Unauthenticated);
        };
        #[derive(Deserialize)]
        struct Resp {
            access_token: String,
            refresh_token: Option<String>,
        }
        let body = serde_json::json!({ "refresh_token": refresh });
        let resp: Resp = self.request_anon(Method::POST, "/api/v1/auth/refresh", Some(body)).await?;
        self.set_tokens(&resp.access_token, resp.refresh_token.as_deref())?;
        Ok(())
    }
}