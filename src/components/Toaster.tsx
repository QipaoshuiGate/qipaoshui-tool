import { create } from "zustand";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "../lib/cn";

interface ToastItem {
  id: number;
  kind: "success" | "error";
  msg: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (kind: ToastItem["kind"], msg: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, msg) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, msg }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().push("success", msg),
  error: (msg: string) => useToastStore.getState().push("error", msg),
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-72 flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            "pointer-events-auto flex animate-fade-up items-start gap-2 rounded-lg border bg-white px-3.5 py-2.5 text-left text-sm shadow-lg",
            "dark:bg-slate-900",
            t.kind === "success"
              ? "border-emerald-200/80 text-slate-700 dark:border-emerald-500/25 dark:text-slate-200"
              : "border-red-200/80 text-slate-700 dark:border-red-500/25 dark:text-slate-200",
          )}
        >
          {t.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          )}
          <span className="min-w-0 break-words">{t.msg}</span>
        </button>
      ))}
    </div>
  );
}
