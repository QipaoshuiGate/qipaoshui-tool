import { type ReactNode } from "react";
import { cn } from "../lib/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  icon,
  title,
  desc,
  actions,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  desc?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {icon && (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
        {desc && <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{desc}</div>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
