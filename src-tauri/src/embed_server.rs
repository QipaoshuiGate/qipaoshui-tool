use std::io;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

/// Single source of truth for the page; Vite serves the same file at
/// /turnstile-embed.html for browser-mode development.
const EMBED_HTML: &str = include_str!("../../public/turnstile-embed.html");

/// Loopback-only HTTP server hosting the Turnstile embed page.
///
/// Cloudflare Turnstile refuses to run on the packaged WebView origin
/// (tauri://localhost is not http(s)), so the auth screen iframes
/// http://localhost:<port>/turnstile instead — a real http origin, valid on
/// every platform once `localhost` is in the sitekey's allowed domains.
pub struct EmbedState {
    pub port: u16,
}

/// Bind 127.0.0.1 on an ephemeral port, serve forever in the background,
/// return the chosen port.
pub async fn start() -> io::Result<u16> {
    let listener = TcpListener::bind(("127.0.0.1", 0)).await?;
    let port = listener.local_addr()?.port();
    tokio::spawn(async move {
        loop {
            match listener.accept().await {
                Ok((sock, _)) => {
                    tokio::spawn(async move {
                        let _ = handle(sock).await;
                    });
                }
                Err(_) => tokio::task::yield_now().await,
            }
        }
    });
    Ok(port)
}

async fn handle(mut sock: TcpStream) -> io::Result<()> {
    let mut buf = [0u8; 4096];
    let n = sock.read(&mut buf).await?;
    let req = String::from_utf8_lossy(&buf[..n]);
    let mut parts = req.lines().next().unwrap_or("").split_whitespace();
    let method = parts.next().unwrap_or("");
    let path = parts.next().unwrap_or("").split('?').next().unwrap_or("");

    let resp = if method == "GET" && path == "/turnstile" {
        format!(
            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nCache-Control: no-store\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            EMBED_HTML.len(),
            EMBED_HTML
        )
    } else {
        "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".to_string()
    };
    sock.write_all(resp.as_bytes()).await?;
    sock.shutdown().await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn serves_embed_page_on_turnstile_path() {
        let port = start().await.unwrap();
        let resp = reqwest::get(format!("http://127.0.0.1:{port}/turnstile?sitekey=x&theme=auto"))
            .await
            .unwrap();
        assert_eq!(resp.status(), 200);
        assert!(resp
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .starts_with("text/html"));
        let body = resp.text().await.unwrap();
        assert!(body.contains("qipaoshui-turnstile"));
        assert!(body.contains("challenges.cloudflare.com"));
    }

    #[tokio::test]
    async fn other_paths_return_404() {
        let port = start().await.unwrap();
        let resp = reqwest::get(format!("http://127.0.0.1:{port}/anything"))
            .await
            .unwrap();
        assert_eq!(resp.status(), 404);
    }
}
