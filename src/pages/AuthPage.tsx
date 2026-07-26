import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { Button } from "../components/Button";
import { Input, Field } from "../components/Input";
import { Card } from "../components/Card";
import { Alert } from "../components/Alert";
import { Logo } from "../components/Logo";
import { Turnstile } from "../components/Turnstile";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [twoFa, setTwoFa] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [totp, setTotp] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const setUser = useStore((s) => s.setUser);
  const setPage = useStore((s) => s.setPage);

  const isReg = mode === "register";

  useEffect(() => {
    api
      .getPublicSettings()
      .then((s) => {
        if (s.turnstile_enabled && s.turnstile_site_key) setSiteKey(s.turnstile_site_key);
      })
      .catch(() => {});
  }, []);

  async function sendCode() {
    setErr(null);
    if (siteKey && !turnstileToken) {
      setErr("请先完成人机验证");
      return;
    }
    try {
      const r = await api.sendVerifyCode({ email, turnstile_token: turnstileToken || undefined });
      setCooldown(r.countdown ?? 60);
      startCountdown();
    } catch (e) {
      setErr(String(e));
    }
  }

  function startCountdown() {
    const t = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(t);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (siteKey && !turnstileToken) {
      setErr("请先完成人机验证");
      return;
    }
    setBusy(true);
    try {
      if (isReg) {
        await api.register({
          email,
          password,
          verify_code: verifyCode,
          invitation_code: inviteCode || undefined,
          turnstile_token: turnstileToken || undefined,
        });
        await afterAuth();
      } else {
        const r = await api.login({ email, password, turnstile_token: turnstileToken || undefined });
        if (r.requires_2fa) {
          setTempToken(r.temp_token ?? "");
          setTwoFa(true);
        } else {
          await afterAuth();
        }
      }
    } catch (err) {
      setErr(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function submit2fa(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api.login2fa({ temp_token: tempToken, totp_code: totp });
      await afterAuth();
    } catch (err) {
      setErr(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function afterAuth() {
    const u = await api.me();
    setUser(u);
    setPage("dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {/* decorative "bubbles" */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 animate-float-slow rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 animate-float rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 top-1/4 h-40 w-40 rounded-full bg-sky-300/15 blur-2xl" />

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo className="h-12 w-12 drop-shadow-lg" />
          <h1 className="mt-3 text-xl font-semibold tracking-tight">气泡水</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {twoFa
              ? "输入动态验证码完成登录"
              : isReg
                ? "创建你的 qipaoshui 账号"
                : "登录你的 qipaoshui 账号"}
          </p>
        </div>

        <Card className="p-6">
          {twoFa ? (
            <form onSubmit={submit2fa} className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <ShieldCheck className="h-4 w-4 text-brand-500" />
                两步验证已开启
              </div>
              <Field label="TOTP 动态码">
                <Input
                  placeholder="6 位数字"
                  value={totp}
                  onChange={(e) => setTotp(e.target.value)}
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                  className="text-center font-mono text-base tracking-[0.4em]"
                />
              </Field>
              {err && <Alert>{err}</Alert>}
              <Button type="submit" className="w-full" loading={busy}>
                确认
              </Button>
              <button
                type="button"
                className="w-full text-center text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                onClick={() => {
                  setTwoFa(false);
                  setTotp("");
                  setErr(null);
                }}
              >
                返回登录
              </button>
            </form>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field label="邮箱">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </Field>
              {isReg && (
                <Field label="邮箱验证码">
                  <div className="flex gap-2">
                    <Input
                      placeholder="6 位验证码"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-20 shrink-0"
                      disabled={cooldown > 0 || !email}
                      onClick={sendCode}
                    >
                      {cooldown > 0 ? `${cooldown}s` : "发送"}
                    </Button>
                  </div>
                </Field>
              )}
              <Field label="密码">
                <Input
                  type="password"
                  placeholder="至少 6 位"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              {isReg && (
                <Field label="邀请码（选填）">
                  <Input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
                </Field>
              )}
              {siteKey && (
                <div className="flex justify-center">
                  <Turnstile onToken={setTurnstileToken} />
                </div>
              )}
              {err && <Alert>{err}</Alert>}
              <Button
                type="submit"
                className="w-full"
                loading={busy}
                disabled={siteKey ? !turnstileToken : undefined}
              >
                {isReg ? "注册" : "登录"}
              </Button>
            </form>
          )}
        </Card>

        {!twoFa && (
          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            {isReg ? "已有账号？" : "还没有账号？"}
            <button
              className="ml-1 font-medium text-brand-600 hover:underline dark:text-brand-400"
              onClick={() => setPage(isReg ? "login" : "register")}
            >
              {isReg ? "去登录" : "去注册"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
