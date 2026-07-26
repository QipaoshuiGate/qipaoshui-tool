import { useEffect, useState, type ReactNode } from "react";
import { KeyRound, LayoutDashboard, Loader2, LogOut } from "lucide-react";
import { api, IS_MOCK } from "./lib/api";
import { useStore } from "./lib/store";
import { cn } from "./lib/cn";
import { AuthPage } from "./pages/AuthPage";
import { Dashboard } from "./pages/Dashboard";
import { KeysPage } from "./pages/KeysPage";
import { Logo } from "./components/Logo";
import { Toaster } from "./components/Toaster";
import type { User } from "./lib/types";

const NAV = [
  { key: "dashboard", label: "控制台", icon: LayoutDashboard },
  { key: "keys", label: "API Keys", icon: KeyRound },
] as const;

export default function App() {
  const { user, setUser, page, setPage } = useStore();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (await api.isAuthenticated()) {
          const u = await api.me();
          setUser(u);
          // in browser preview mode, `?page=keys` deep-links a screen directly
          const preview = IS_MOCK && new URLSearchParams(location.search).get("page");
          setPage(preview === "keys" ? "keys" : "dashboard");
        }
      } catch {
        // not logged in
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  async function logout() {
    try {
      await api.logout();
    } catch {}
    setUser(null);
    setPage("login");
  }

  let content: ReactNode;
  if (booting) {
    content = <BootScreen />;
  } else if (!user) {
    content = <AuthPage mode={page === "register" ? "register" : "login"} />;
  } else {
    content = (
      <div className="flex h-screen overflow-hidden">
        <Sidebar user={user} onLogout={logout} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-8 py-8">
            {page === "dashboard" && <Dashboard />}
            {page === "keys" && <KeysPage />}
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      {content}
      <Toaster />
      {IS_MOCK && (
        <div className="fixed bottom-3 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          浏览器预览模式 · 模拟数据
        </div>
      )}
    </>
  );
}

function BootScreen() {
  return (
    <div className="grid h-screen place-items-center">
      <div className="flex flex-col items-center gap-4 animate-fade-up">
        <Logo className="h-14 w-14 drop-shadow-lg" />
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在启动…
        </div>
      </div>
    </div>
  );
}

function Sidebar({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { page, setPage } = useStore();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <Logo className="h-9 w-9" />
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight tracking-tight">气泡水</div>
          <div className="text-[11px] leading-tight text-slate-400">qipaoshui.buzz</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 pt-2">
        {NAV.map(({ key, label, icon: Icon }) => {
          const active = page === key;
          return (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-semibold uppercase text-white">
            {user.email?.[0] ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium" title={user.email}>
              {user.email}
            </div>
            <div className="text-[11px] text-slate-400">
              余额 ${(user.balance ?? 0).toFixed(2)}
            </div>
          </div>
          <button
            onClick={onLogout}
            title="登出"
            className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
