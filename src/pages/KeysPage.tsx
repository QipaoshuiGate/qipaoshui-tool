import { useEffect, useState } from "react";
import { Check, Clock, Copy, Eye, EyeOff, KeyRound, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import type { ApiKey } from "../lib/types";
import { Button } from "../components/Button";
import { Input, Field } from "../components/Input";
import { Card } from "../components/Card";
import { Alert } from "../components/Alert";
import { Modal, ConfirmDialog } from "../components/Modal";
import { toast } from "../components/Toaster";
import { cn } from "../lib/cn";

export function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [toDelete, setToDelete] = useState<ApiKey | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setErr(null);
    try {
      const r = await api.listApiKeys(1, 50);
      setKeys(r.items);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setCreating(true);
    try {
      await api.createKey({ name });
      setName("");
      setShowCreate(false);
      toast.success("已创建 API Key");
      await load();
    } catch (e2) {
      setErr(String(e2));
    } finally {
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteKey(toDelete.id);
      setToDelete(null);
      toast.success("已删除 API Key");
      await load();
    } catch (e) {
      setErr(String(e));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  async function copy(k: ApiKey) {
    try {
      await navigator.clipboard.writeText(k.key);
      setCopied(k.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("复制失败");
    }
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            API Keys
            {!loading && (
              <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {keys.length}
              </span>
            )}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            用于接入 qipaoshui 服务的访问凭证
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" />
          新建 Key
        </Button>
      </div>

      {err && <Alert>{err}</Alert>}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Card key={i} className="h-24 animate-pulse border-dashed bg-slate-50 dark:bg-slate-900/50">
              <div />
            </Card>
          ))}
        </div>
      ) : keys.length === 0 ? (
        <Card className="flex flex-col items-center border-dashed py-12 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 dark:bg-brand-500/10">
            <KeyRound className="h-6 w-6 text-brand-500" />
          </div>
          <p className="mt-3 text-sm font-medium">还没有 API Key</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            创建一个 Key，即可在控制台一键接入 qipaoshui
          </p>
          <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            新建 Key
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <KeyRow
              key={k.id}
              k={k}
              revealed={!!revealed[k.id]}
              copied={copied === k.id}
              onToggleReveal={() =>
                setRevealed((r) => ({ ...r, [k.id]: !r[k.id] }))
              }
              onCopy={() => copy(k)}
              onDelete={() => setToDelete(k)}
            />
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="新建 API Key">
        <form onSubmit={create} className="space-y-4">
          <Field label="名称">
            <Input
              placeholder="例如：工作机"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreate(false)}
              disabled={creating}
            >
              取消
            </Button>
            <Button type="submit" loading={creating}>
              创建
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        busy={deleting}
        title="删除 API Key"
        message={
          <>
            确定删除「{toDelete?.name}」吗？使用该 Key 的客户端将立即失效，此操作不可撤销。
          </>
        }
      />
    </div>
  );
}

function maskKey(key: string) {
  if (key.length <= 14) return key;
  return `${key.slice(0, 10)}••••••••${key.slice(-4)}`;
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "enabled" || s === "active")
    return {
      label: "启用",
      cls: "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400",
    };
  if (s === "disabled" || s === "inactive")
    return {
      label: "停用",
      cls: "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
    };
  return {
    label: status,
    cls: "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400",
  };
}

function KeyRow({
  k,
  revealed,
  copied,
  onToggleReveal,
  onCopy,
  onDelete,
}: {
  k: ApiKey;
  revealed: boolean;
  copied: boolean;
  onToggleReveal: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const badge = statusBadge(k.status);
  const hasQuota = k.quota > 0;
  const pct = hasQuota ? Math.min(100, (k.quota_used / k.quota) * 100) : 0;

  return (
    <Card className="p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{k.name}</span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                badge.cls,
              )}
            >
              {badge.label}
            </span>
            {k.expires_at && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                <Clock className="h-3 w-3" />
                {k.expires_at.slice(0, 10)} 过期
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <code
              className="truncate rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              data-selectable
              title={revealed ? k.key : undefined}
            >
              {revealed ? k.key : maskKey(k.key)}
            </code>
            <IconButton
              title={revealed ? "隐藏" : "显示完整 Key"}
              onClick={onToggleReveal}
            >
              {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </IconButton>
            <IconButton title="复制" onClick={onCopy}>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </IconButton>
          </div>

          <div className="max-w-sm">
            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
              <span>
                已用 ${k.quota_used.toFixed(2)}
                {hasQuota && ` / 配额 $${k.quota}`}
              </span>
              {hasQuota && <span>{pct.toFixed(0)}%</span>}
            </div>
            {hasQuota && (
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    pct >= 90 ? "bg-red-500" : "bg-brand-500",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <IconButton title="删除" danger onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </Card>
  );
}

function IconButton({
  children,
  title,
  danger = false,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-md p-1.5 transition-colors",
        danger
          ? "text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300",
      )}
    >
      {children}
    </button>
  );
}
