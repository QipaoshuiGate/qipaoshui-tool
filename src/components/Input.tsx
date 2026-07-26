import { type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-shadow",
        "placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-500",
        "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:focus:border-brand-500",
        className,
      )}
      {...rest}
    />
  );
}

/** Labeled form field. Wraps the control in a <label>, so clicking the label focuses it. */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-slate-400 dark:text-slate-500">{hint}</span>}
    </label>
  );
}
