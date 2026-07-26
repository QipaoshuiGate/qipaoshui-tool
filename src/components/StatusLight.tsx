import type { ActiveStatus } from "../lib/types";
import { cn } from "../lib/cn";

const STYLES: Record<
  ActiveStatus,
  { dot: string; pill: string; label: string; ping?: string }
> = {
  Qipaoshui: {
    dot: "bg-emerald-500",
    ping: "bg-emerald-400",
    pill: "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400",
    label: "已接入 qipaoshui",
  },
  Official: {
    dot: "bg-slate-400",
    pill: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    label: "官方配置",
  },
  Unknown: {
    dot: "bg-amber-500",
    pill: "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400",
    label: "未知状态",
  },
};

export function StatusLight({ status }: { status: ActiveStatus }) {
  const s = STYLES[status] ?? STYLES.Unknown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        s.pill,
      )}
    >
      <span className="relative flex h-2 w-2">
        {s.ping && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
              s.ping,
            )}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", s.dot)} />
      </span>
      {s.label}
    </span>
  );
}
