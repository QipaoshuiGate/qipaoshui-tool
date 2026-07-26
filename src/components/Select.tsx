import { type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/cn";

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(
          "w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm text-slate-900 shadow-sm transition-shadow",
          "dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100",
          "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:focus:border-brand-500",
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}
