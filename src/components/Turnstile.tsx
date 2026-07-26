import { useEffect, useRef, useState } from "react";

// The Cloudflare Turnstile challenge refuses to run on the packaged app's own
// origin (tauri://localhost is not a valid http(s) origin), so the widget is
// hosted by the service itself at /turnstile/embed — a real https page on the
// allowlisted domain — and embedded here in an iframe. The page reports back
// via postMessage. Host must match BASE_URL in src-tauri/src/http_client.rs.
const EMBED_ORIGIN = "https://qipaoshui.buzz";
const EMBED_URL = `${EMBED_ORIGIN}/turnstile/embed`;
const READY_TIMEOUT_MS = 15_000;

interface EmbedMessage {
  source?: string;
  event?: "ready" | "token" | "expired" | "error";
  token?: string;
  code?: string;
}

export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setReady(false);
    setErr(null);
    const timer = setTimeout(
      () => setErr("人机验证加载超时，请检查网络后重试"),
      READY_TIMEOUT_MS,
    );

    function onMessage(e: MessageEvent<EmbedMessage>) {
      // only trust messages coming from our own embed page's iframe
      if (e.origin !== EMBED_ORIGIN || e.source !== frameRef.current?.contentWindow) return;
      if (e.data?.source !== "qipaoshui-turnstile") return;
      switch (e.data.event) {
        case "ready":
          clearTimeout(timer);
          setReady(true);
          break;
        case "token":
          setErr(null);
          onToken(e.data.token ?? "");
          break;
        case "expired":
          onToken("");
          break;
        case "error":
          clearTimeout(timer);
          onToken("");
          setErr(e.data.code ? `人机验证失败（错误码 ${e.data.code}）` : "人机验证加载失败");
          break;
      }
    }
    window.addEventListener("message", onMessage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  function retry() {
    onToken("");
    setAttempt((n) => n + 1); // key change below remounts the iframe
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <iframe
        key={attempt}
        ref={frameRef}
        src={EMBED_URL}
        title="人机验证"
        className={ready ? "h-[65px] w-[300px] border-0" : "h-0 w-0 border-0"}
      />
      {!ready && !err && <p className="text-xs text-slate-400">人机验证加载中…</p>}
      {err && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-red-500">{err}</p>
          <button
            type="button"
            onClick={retry}
            className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            重试
          </button>
        </div>
      )}
    </div>
  );
}
