mod api_keys;
mod auth;
mod config;
mod error;
mod http_client;
mod provider;
mod settings;

use api_keys::{ApiKey, CreateBody, Paginated, UpdateBody};
use auth::{AuthResp, Login2faBody, LoginBody, RegisterBody, SendVerifyCodeBody, User};
use http_client::HttpState;
use provider::{ActiveStatus, ApplyParams, StatusInfo};
use reqwest::Method;
use settings::PublicSettings;
use tauri::Manager;

// ---------------- Auth commands ----------------

#[tauri::command]
async fn send_verify_code(state: tauri::State<'_, HttpState>, body: SendVerifyCodeBody) -> Result<auth::SendVerifyCodeResp, error::AppError> {
    auth::send_verify_code(&state, body).await
}

#[tauri::command]
async fn register(state: tauri::State<'_, HttpState>, body: RegisterBody) -> Result<AuthResp, error::AppError> {
    auth::register(&state, body).await
}

#[tauri::command]
async fn login(state: tauri::State<'_, HttpState>, body: LoginBody) -> Result<AuthResp, error::AppError> {
    auth::login(&state, body).await
}

#[tauri::command]
async fn login_2fa(state: tauri::State<'_, HttpState>, body: Login2faBody) -> Result<AuthResp, error::AppError> {
    auth::login_2fa(&state, body).await
}

#[tauri::command]
async fn logout(state: tauri::State<'_, HttpState>) -> Result<(), error::AppError> {
    auth::logout(&state).await
}

#[tauri::command]
async fn me(state: tauri::State<'_, HttpState>) -> Result<User, error::AppError> {
    auth::me(&state).await
}

#[tauri::command]
fn is_authenticated(state: tauri::State<'_, HttpState>) -> bool {
    state.get_access_token().is_some()
}

// ---------------- Public settings ----------------

#[tauri::command]
async fn get_public_settings(state: tauri::State<'_, HttpState>) -> Result<PublicSettings, error::AppError> {
    settings::get_public_settings(&state).await
}

// ---------------- Debug logging ----------------

#[tauri::command]
fn frontend_log(level: String, msg: String) {
    eprintln!("[frontend:{level}] {msg}");
}

// ---------------- API Key commands ----------------

#[tauri::command]
async fn list_api_keys(state: tauri::State<'_, HttpState>, page: i64, page_size: i64) -> Result<Paginated, error::AppError> {
    api_keys::list(&state, page, page_size).await
}

#[tauri::command]
async fn create_api_key(state: tauri::State<'_, HttpState>, body: CreateBody) -> Result<ApiKey, error::AppError> {
    api_keys::create(&state, body).await
}

#[tauri::command]
async fn update_api_key(state: tauri::State<'_, HttpState>, id: i64, body: UpdateBody) -> Result<ApiKey, error::AppError> {
    api_keys::update(&state, id, body).await
}

#[tauri::command]
async fn delete_api_key(state: tauri::State<'_, HttpState>, id: i64) -> Result<(), error::AppError> {
    api_keys::delete(&state, id).await
}

// ---------------- Provider switch commands ----------------

#[tauri::command]
fn apply_qipaoshui_provider(params: ApplyParams) -> Result<(), error::AppError> {
    provider::apply_qipaoshui(&params)
}

#[tauri::command]
fn restore_official_provider() -> Result<(), error::AppError> {
    provider::restore_official()
}

#[tauri::command]
fn provider_status() -> Result<StatusInfo, error::AppError> {
    provider::current_status()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = Method::GET; // make sure reqwest import is referenced
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let state = HttpState::new(app.handle().clone());
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            send_verify_code,
            register,
            login,
            login_2fa,
            logout,
            me,
            is_authenticated,
            get_public_settings,
            frontend_log,
            list_api_keys,
            create_api_key,
            update_api_key,
            delete_api_key,
            apply_qipaoshui_provider,
            restore_official_provider,
            provider_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}