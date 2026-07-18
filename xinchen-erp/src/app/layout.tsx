import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "新辰ERP - 留学业务管理系统",
  description: "新辰留学业务管理系统",
};

const errorScript = `
window.addEventListener('error', function(e) {
  var msg = e.message || 'Unknown error';
  var file = e.filename || '';
  var line = e.lineno || 0;
  var stack = (e.error && e.error.stack) ? e.error.stack : '';
  console.error('[APP ERROR]', msg, file, line, stack);
  var div = document.createElement('div');
  div.id = '__app_error_display';
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#fef2f2;border-bottom:2px solid #dc2626;padding:12px 20px;font-family:monospace;font-size:13px;color:#991b1b;max-height:300px;overflow:auto;';
  div.innerHTML = '<b>JS错误:</b> ' + msg + '<br><b>文件:</b> ' + file + ':' + line + '<br><pre style="margin-top:8px;white-space:pre-wrap;">' + stack + '</pre>';
  document.body.appendChild(div);
});
window.addEventListener('unhandledrejection', function(e) {
  var reason = (e.reason && e.reason.message) ? e.reason.message : String(e.reason);
  var stack = (e.reason && e.reason.stack) ? e.reason.stack : '';
  console.error('[APP REJECTION]', reason, stack);
  var div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#fef2f2;border-bottom:2px solid #dc2626;padding:12px 20px;font-family:monospace;font-size:13px;color:#991b1b;max-height:300px;overflow:auto;';
  div.innerHTML = '<b>Promise错误:</b> ' + reason + '<br><pre style="margin-top:8px;white-space:pre-wrap;">' + stack + '</pre>';
  document.body.appendChild(div);
});
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 min-h-screen">
        <script dangerouslySetInnerHTML={{ __html: errorScript }} />
        {children}
      </body>
    </html>
  );
}
