"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: "40px", fontFamily: "monospace", maxWidth: "800px", margin: "0 auto" }}>
          <h2 style={{ color: "#dc2626", marginBottom: "20px" }}>页面加载错误</h2>
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "16px", marginBottom: "20px", wordBreak: "break-all" }}>
            <p style={{ fontWeight: "bold", marginBottom: "8px" }}>错误信息:</p>
            <p style={{ color: "#991b1b" }}>{error?.message || "未知错误"}</p>
            {error?.digest && <p style={{ color: "#6b7280", fontSize: "12px", marginTop: "8px" }}>Error ID: {error.digest}</p>}
          </div>
          {error?.stack && (
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", marginBottom: "20px", overflow: "auto" }}>
              <p style={{ fontWeight: "bold", marginBottom: "8px" }}>调用堆栈:</p>
              <pre style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>{error.stack}</pre>
            </div>
          )}
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={() => reset()} style={{ padding: "8px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
              重试
            </button>
            <a href="/login" style={{ padding: "8px 20px", background: "#e5e7eb", color: "#374151", border: "none", borderRadius: "6px", textDecoration: "none" }}>
              返回登录
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
