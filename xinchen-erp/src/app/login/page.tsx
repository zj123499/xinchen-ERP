"use client";

import { useState } from "react";
import { KeyRound, GraduationCap } from "lucide-react";

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
      // 服务端已通过 Set-Cookie 设置 httpOnly cookie，无需前端 JS 设置
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
      // 服务端已通过 Set-Cookie 设置 httpOnly cookie，无需前端 JS 设置
      setTimeout(() => { window.location.href = "/"; }, 50);
    } catch { setChgError("网络错误"); }
    finally { setChgLoading(false); }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* 左侧品牌区 */}
      <div className="hidden lg:flex w-[480px] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 relative flex-col items-center justify-center overflow-hidden">
        {/* 装饰几何 */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full border-2 border-white/10" />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full border border-white/8" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full border-2 border-white/10" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-violet-400 to-indigo-400 rounded-full opacity-20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-blue-400 to-indigo-500 rounded-full opacity-15 blur-3xl" />

        {/* 品牌内容 */}
        <div className="relative z-10 text-center px-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)]">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3 tracking-tight">新辰未来</h1>
          <p className="text-indigo-200 text-sm mb-12 leading-relaxed">企业管理系统</p>

          {/* Slogan */}
          <p className="text-indigo-200 text-base font-light tracking-[0.3em] uppercase">New Light · New Future</p>
        </div>

        {/* 底部波浪 */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 480 40" className="w-full h-10 text-white fill-current opacity-10">
            <path d="M0,20 C120,0 240,40 360,20 C420,10 460,15 480,20 L480,40 L0,40 Z" />
          </svg>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-[380px]">
          {needChangePwd ? (
            <form onSubmit={changePassword}>
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">修改密码</h2>
                <p className="text-slate-500 text-sm">首次登录需修改默认密码</p>
              </div>
              {chgError && <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl">{chgError}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">原密码</label>
                  <input type="password" value={oldPassword} readOnly className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition bg-slate-50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">新密码</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition" placeholder="至少6位" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">确认密码</label>
                  <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-400 focus:bg-white transition" />
                </div>
              </div>
              <button type="submit" disabled={chgLoading} className="w-full mt-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-semibold text-sm tracking-wider hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-50">
                {chgLoading ? "修改中..." : "修改并登录"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6 lg:hidden">
                  <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-lg text-slate-900">新辰未来</span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">欢迎回来</h2>
                <p className="text-slate-400 text-sm">请登录您的账户</p>
              </div>

              {error && (
                <div className="mb-5 bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-2xl flex items-center gap-2">
                  <span className="shrink-0">⚠</span> {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">用户名</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="erp-username"
                      autoComplete="off"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="w-full px-4 py-3 pl-11 border-2 border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-400 transition"
                      placeholder="手机号 / 用户名" />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">👤</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">密码</label>
                  <div className="relative">
                    <input
                      type="password"
                      name="erp-password"
                      autoComplete="new-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pl-11 border-2 border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-400 transition"
                      placeholder="输入密码" />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🔒</span>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full mt-6 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl font-semibold text-sm tracking-widest hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
                {loading ? "验证中..." : "登 录"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
