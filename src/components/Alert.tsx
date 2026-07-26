import { type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "../lib/cn";

export function Alert({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700",
        "dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
        className,
      )}
      data-selectable
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
