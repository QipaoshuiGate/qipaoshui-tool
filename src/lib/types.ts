export interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  balance: number;
  status: string;
}

export interface AuthResp {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  user?: User;
  requires_2fa: boolean;
  temp_token?: string;
  user_email_masked?: string;
}

export interface SendVerifyCodeBody {
  email: string;
  turnstile_token?: string;
}
export interface SendVerifyCodeResp {
  message: string;
  countdown?: number;
}
export interface RegisterBody {
  email: string;
  password: string;
  verify_code: string;
  turnstile_token?: string;
  promo_code?: string;
  invitation_code?: string;
  aff_code?: string;
}
export interface LoginBody {
  email: string;
  password: string;
  turnstile_token?: string;
}
export interface Login2faBody {
  temp_token: string;
  totp_code: string;
}

export interface PublicSettings {
  turnstile_enabled: boolean;
  turnstile_site_key: string;
}

export interface ApiKey {
  id: number;
  key: string;
  name: string;
  group_id?: number | null;
  status: string;
  quota: number;
  quota_used: number;
  expires_at?: string | null;
  created_at: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateKeyBody {
  name: string;
  group_id?: number;
  custom_key?: string;
  quota?: number;
  expires_in_days?: number;
}
export interface UpdateKeyBody {
  name?: string;
  status?: string;
  quota?: number;
}

export type ActiveStatus = "Official" | "Qipaoshui" | "Unknown";
export interface StatusInfo {
  codex: ActiveStatus;
  claude: ActiveStatus;
  has_snapshot: boolean;
}
export interface ApplyParams {
  api_key: string;
  base_url: string; // codex: with /v1
  claude_base_url: string; // claude: bare host
  model: string;
  wire_api: string; // "responses" | "chat"
  context_window?: number | null;
}