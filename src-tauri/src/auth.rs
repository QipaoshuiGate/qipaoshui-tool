use crate::error::Result;
use crate::http_client::HttpState;
use reqwest::Method;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct SendVerifyCodeBody {
    pub email: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub turnstile_token: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct SendVerifyCodeResp {
    pub message: String,
    pub countdown: Option<i64>,
}

#[derive(Serialize, Deserialize)]
pub struct RegisterBody {
    pub email: String,
    pub password: String,
    pub verify_code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub turnstile_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub promo_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub invitation_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aff_code: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct LoginBody {
    pub email: String,
    pub password: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub turnstile_token: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct Login2faBody {
    pub temp_token: String,
    pub totp_code: String,
}

#[derive(Serialize, Deserialize)]
pub struct User {
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub email: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub role: String,
    #[serde(default)]
    pub balance: f64,
    #[serde(default)]
    pub status: String,
}

#[derive(Serialize, Deserialize)]
pub struct AuthResp {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: Option<i64>,
    pub token_type: Option<String>,
    pub user: Option<User>,
    #[serde(default)]
    pub requires_2fa: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub temp_token: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub user_email_masked: Option<String>,
}

pub async fn send_verify_code(
    state: &HttpState,
    body: SendVerifyCodeBody,
) -> Result<SendVerifyCodeResp> {
    state.request_anon(Method::POST, "/api/v1/auth/send-verify-code", Some(serde_json::to_value(&body)?)).await
}

pub async fn register(state: &HttpState, body: RegisterBody) -> Result<AuthResp> {
    let resp: AuthResp = state.request_anon(Method::POST, "/api/v1/auth/register", Some(serde_json::to_value(&body)?)).await?;
    state.set_tokens(&resp.access_token, resp.refresh_token.as_deref())?;
    Ok(resp)
}

pub async fn login(state: &HttpState, body: LoginBody) -> Result<AuthResp> {
    let resp: AuthResp = state.request_anon(Method::POST, "/api/v1/auth/login", Some(serde_json::to_value(&body)?)).await?;
    if !resp.requires_2fa {
        state.set_tokens(&resp.access_token, resp.refresh_token.as_deref())?;
    }
    Ok(resp)
}

pub async fn login_2fa(state: &HttpState, body: Login2faBody) -> Result<AuthResp> {
    let resp: AuthResp = state.request_anon(Method::POST, "/api/v1/auth/login/2fa", Some(serde_json::to_value(&body)?)).await?;
    state.set_tokens(&resp.access_token, resp.refresh_token.as_deref())?;
    Ok(resp)
}

pub async fn logout(state: &HttpState) -> Result<()> {
    // best effort; ignore server error then clear local.
    let _ = state
        .request::<serde_json::Value>(Method::POST, "/api/v1/auth/logout", Some(serde_json::json!({})))
        .await;
    state.clear_tokens()?;
    Ok(())
}

pub async fn me(state: &HttpState) -> Result<User> {
    state.request::<User>(Method::GET, "/api/v1/auth/me", None).await
}