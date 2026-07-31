"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [needChangePwd, setNeedChangePwd] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [chgError, setChgError] = useState("");
  const [chgLoading, setChgLoading] = useState(false);

  const redirectTo = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("redirect") || "/") : "/";
  const loginError = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("error") === "1" ? "用户名或密码错误" : "") : "";

  async function handleChangePwd(e: React.FormEvent) {
    e.preventDefault();
    setChgError("");
    if (newPassword.length < 6) { setChgError("新密码至少 6 位"); return; }
    if (newPassword !== confirmPwd) { setChgError("两次输入的新密码不一致"); return; }
    setChgLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oldPassword, newPassword }) });
      if (!res.ok) { const data = await res.json(); setChgError(data.error || "修改失败"); return; }
      window.location.href = "/";
    } catch { setChgError("网络错误"); }
    finally { setChgLoading(false); }
  }

  if (needChangePwd) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800">
        <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-amber-500 rounded-xl flex items-center justify-center mb-4"><KeyRound className="w-8 h-8 text-white" /></div>
            <h1 className="text-xl font-bold text-gray-900">请修改登录密码</h1>
          </div>
          <form onSubmit={handleChangePwd} className="space-y-4">
            {chgError && <div className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm">{chgError}</div>}
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">新密码</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">确认新密码</label><input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" required /></div>
            <button type="submit" disabled={chgLoading} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">{chgLoading ? "提交中..." : "确认修改并登录"}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.svg" alt="Newill 新辰未来" className="h-20 w-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Newill 新辰未来</h1>
          <p className="text-gray-500 mt-1">留学业务管理系统</p>
        </div>
        {/* 传统 HTML form POST，浏览器原生处理 302+Set-Cookie */}
        <form method="POST" action="/api/auth/login" className="space-y-5">
          {loginError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{loginError}</div>}
          <input type="hidden" name="redirect" value={redirectTo} />
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">手机号 / 用户名</label><input type="text" name="username" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="请输入手机号或用户名" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label><input type="password" name="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="请输入密码" required /></div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">登 录</button>
        </form>
      </div>
    </div>
  );
}
