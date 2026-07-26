import { invoke } from "@tauri-apps/api/core";
import type {
  ApiKey,
  ApplyParams,
  AuthResp,
  CreateKeyBody,
  Login2faBody,
  LoginBody,
  Paginated,
  PublicSettings,
  RegisterBody,
  SendVerifyCodeBody,
  SendVerifyCodeResp,
  StatusInfo,
  UpdateKeyBody,
  User,
} from "./types";

/** True when running in a plain browser during dev (no Tauri backend) — UI preview mode. */
export const IS_MOCK =
  import.meta.env.DEV && typeof window !== "undefined" && !("__TAURI_INTERNALS__" in window);

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (IS_MOCK) {
    const { mockInvoke } = await import("./mock");
    return mockInvoke(cmd, args) as Promise<T>;
  }
  return invoke<T>(cmd, args);
}

export const api = {
  sendVerifyCode: (body: SendVerifyCodeBody) =>
    call<SendVerifyCodeResp>("send_verify_code", { body }),
  register: (body: RegisterBody) => call<AuthResp>("register", { body }),
  login: (body: LoginBody) => call<AuthResp>("login", { body }),
  login2fa: (body: Login2faBody) => call<AuthResp>("login_2fa", { body }),
  logout: () => call<void>("logout"),
  me: () => call<User>("me"),
  isAuthenticated: () => call<boolean>("is_authenticated"),
  getPublicSettings: () => call<PublicSettings>("get_public_settings"),

  listApiKeys: (page = 1, pageSize = 20) =>
    call<Paginated<ApiKey>>("list_api_keys", { page, pageSize }),
  createKey: (body: CreateKeyBody) => call<ApiKey>("create_api_key", { body }),
  updateKey: (id: number, body: UpdateKeyBody) =>
    call<ApiKey>("update_api_key", { id, body }),
  deleteKey: (id: number) => call<void>("delete_api_key", { id }),

  applyQipaoshui: (params: ApplyParams) =>
    call<void>("apply_qipaoshui_provider", { params }),
  restoreOfficial: () => call<void>("restore_official_provider"),
  providerStatus: () => call<StatusInfo>("provider_status"),

  turnstileEmbedUrl: () => call<string>("turnstile_embed_url"),
};
