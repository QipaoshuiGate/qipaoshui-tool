import { useEffect, useState } from "react";
import { RefreshCw, SquareTerminal, Sparkles, Zap } from "lucide-react";
import { api } from "../lib/api";
import { useStore } from "../lib/store";
import { Button } from "../components/Button";
import { Input, Field } from "../components/Input";
import { Select } from "../components/Select";
import { Card, CardHeader } from "../components/Card";
import { Alert } from "../components/Alert";
import { StatusLight } from "../components/StatusLight";
import { toast } from "../components/Toaster";
import { cn } from "../lib/cn";
import type { ApiKey, StatusInfo } from "../lib/types";

export function Dashboard() {
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [busy, setBusy] = useState<"apply" | "restore" | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const user = useStore((s) => s.user);
  const setPage = useStore((s) => s.setPage);

  // apply form
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-5.5");
  const [wireApi, setWireApi] = useState<"responses" | "chat">("responses");
  const [baseUrl, setBaseUrl] = useState("https://qipaoshui.buzz/v1");
  const [claudeBaseUrl, setClaudeBaseUrl] = useState("https://qipaoshui.buzz");

  async function refresh() {
    setErr(null);
    setRefreshing(true);
    try {
      const [s, k] = await Promise.all([api.providerStatus(), api.listApiKeys(1, 50)]);
      setStatus(s);
      setKeys(k.items);
      if (k.items.length && !apiKey) setApiKey(k.items[0].key);
    } catch (e) {
      setErr(String(e));
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function apply() {
    setBusy("apply");
    setErr(null);
    try {
      await api.applyQipaoshui({
        api_key: apiKey,
        base_url: baseUrl,
        claude_base_url: claudeBaseUrl,
        model,
        wire_api: wireApi,
        context_window: null,
      });
      toast.success("已切换到 qipaoshui");
      await refresh();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    setBusy("restore");
    setErr(null);
    try {
      await api.restoreOfficial();
      toast.success("已恢复官方配置");
      await refresh();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">控制台</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            一键将本机 Codex 与 Claude Code 接入 qipaoshui 中转
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          刷新
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <CardHeader
            icon={<SquareTerminal className="h-5 w-5" />}
            title="Codex"
            desc="~/.codex/config.toml"
            actions={<StatusLight status={status?.codex ?? "Unknown"} />}
          />
        </Card>
        <Card className="p-4">
          <CardHeader
            icon={<Sparkles className="h-5 w-5" />}
            title="Claude Code"
            desc="~/.claude/settings.json"
            actions={<StatusLight status={status?.claude ?? "Unknown"} />}
          />
        </Card>
      </div>

      <Card>
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <CardHeader
            icon={<Zap className="h-5 w-5" />}
            title="一键切换"
            desc="将 CLI 配置指向 qipaoshui，或随时恢复官方设置（会自动备份）"
          />
        </div>

        <div className="space-y-4 p-5">
          {err && <Alert>{err}</Alert>}

          {keys.length > 0 ? (
            <Field label="API Key">
              <Select value={apiKey} onChange={(e) => setApiKey(e.target.value)}>
                {keys.map((k) => (
                  <option key={k.id} value={k.key}>
                    {k.name}（{k.key.slice(0, 10)}…）
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                API Key
              </span>
              <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <span>暂无可用的 API Key</span>
                <button
                  type="button"
                  className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                  onClick={() => setPage("keys")}
                >
                  去创建 →
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="模型">
              <Input value={model} onChange={(e) => setModel(e.target.value)} />
            </Field>
            <Field label="接口协议（wire_api）">
              <Select
                value={wireApi}
                onChange={(e) => setWireApi(e.target.value as "responses" | "chat")}
              >
                <option value="responses">responses</option>
                <option value="chat">chat</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Codex Base URL">
              <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
            </Field>
            <Field label="Claude Base URL">
              <Input value={claudeBaseUrl} onChange={(e) => setClaudeBaseUrl(e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="flex items-center gap-2.5 border-t border-slate-200 p-5 pt-4 dark:border-slate-800">
          <Button onClick={apply} loading={busy === "apply"} disabled={busy !== null || !apiKey}>
            {busy !== "apply" && <Zap className="h-4 w-4" />}
            应用 qipaoshui
          </Button>
          <Button
            variant="secondary"
            onClick={restore}
            loading={busy === "restore"}
            disabled={busy !== null || !status?.has_snapshot}
            title={status?.has_snapshot ? undefined : "尚无备份快照，无法恢复"}
          >
            恢复官方配置
          </Button>
          {user && (
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
              账户余额 ${(user.balance ?? 0).toFixed(2)}
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
