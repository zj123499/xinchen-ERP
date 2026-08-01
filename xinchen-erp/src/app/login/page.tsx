"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needChangePwd, setNeedChangePwd] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [chgError, setChgError] = useState("");
  const [chgLoading, setChgLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: "登录失败" }));
        setError(d.error || "用户名或密码错误");
        return;
      }
      const data = await res.json();
      if (data.user?.mustChangePassword) {
        setOldPassword(password);
        setNeedChangePwd(true);
        return;
      }
      // JSON 模式：js 写 cookie + 跳转
      document.cookie = "token=" + data.token + "; path=/";
      window.location.href = "/";
    } catch {
      setError("网络错误，请重试");
    } finally { setLoading(false); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPwd) { setChgError("两次密码不一致"); return; }
    if (newPassword.length < 6) { setChgError("密码至少6位"); return; }
    setChgLoading(true); setChgError("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, oldPassword, newPassword }),
      });
      if (!res.ok) { const d = await res.json(); setChgError(d.error || "修改失败"); return; }
      const data = await res.json();
      document.cookie = "token=" + data.token + "; path=/";
      setTimeout(() => { window.location.href = "/"; }, 50);
    } catch { setChgError("网络错误"); }
    finally { setChgLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* 装饰光晕 */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-100/50 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-sky-100/40 blur-3xl pointer-events-none" />

      <div className="bg-white/90 backdrop-blur-md border border-black/5 rounded-2xl px-10 py-11 w-full max-w-[420px] relative z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_8px_32px_rgba(79,70,229,0.04)]">
        {needChangePwd ? (
          <form onSubmit={changePassword}>
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-[0_4px_16px_rgba(79,70,229,0.2)]">
                <KeyRound className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">修改密码</h1>
              <p className="text-slate-500 text-sm mt-1">首次登录需修改默认密码</p>
            </div>
            {chgError && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{chgError}</div>}
            <div className="mb-4"><label className="block text-xs font-semibold text-slate-700 mb-1.5">原密码</label><input type="password" value={oldPassword} readOnly className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-[3px] focus:ring-indigo-50 transition" /></div>
            <div className="mb-4"><label className="block text-xs font-semibold text-slate-700 mb-1.5">新密码</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-[3px] focus:ring-indigo-50 transition" placeholder="至少6位" /></div>
            <div className="mb-6"><label className="block text-xs font-semibold text-slate-700 mb-1.5">确认密码</label><input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-[3px] focus:ring-indigo-50 transition" /></div>
            <button type="submit" disabled={chgLoading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm tracking-wider hover:bg-indigo-700 transition shadow-[0_2px_8px_rgba(79,70,229,0.18)] disabled:opacity-50">{chgLoading ? "修改中..." : "修改并登录"}</button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-[0_4px_16px_rgba(79,70,229,0.2)]">
                <KeyRound className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">新辰未来</h1>
              <p className="text-slate-400 text-xs mt-1 tracking-widest">企业管理系统</p>
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{error}</div>}
            <div className="mb-4"><label className="block text-xs font-semibold text-slate-700 mb-1.5">用户名</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-[3px] focus:ring-indigo-50 transition" placeholder="手机号 / 用户名" /></div>
            <div className="mb-6"><label className="block text-xs font-semibold text-slate-700 mb-1.5">密码</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-[3px] focus:ring-indigo-50 transition" placeholder="输入密码" /></div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm tracking-widest hover:bg-indigo-700 transition shadow-[0_2px_8px_rgba(79,70,229,0.18)] disabled:opacity-50">{loading ? "登录中..." : "登 录 系 统"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
