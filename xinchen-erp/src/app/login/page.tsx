"use client";

import { useState } from "react";
import { GraduationCap, KeyRound } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 强制改密
  const [needChangePwd, setNeedChangePwd] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [chgError, setChgError] = useState("");
  const [chgLoading, setChgLoading] = useState(false);

  function goRedirect() {
    const redirectTo = new URLSearchParams(window.location.search).get("redirect") || "/";
    const separator = redirectTo.includes("?") ? "&" : "?";
    window.location.replace(`${redirectTo}${separator}t=${Date.now()}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "登录失败");
        return;
      }

      const data = await res.json();
      // 首次登录（或管理员重置后）必须修改密码
      if (data.user?.mustChangePassword) {
        setOldPassword(password);
        setNeedChangePwd(true);
        return;
      }

      goRedirect();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePwd(e: React.FormEvent) {
    e.preventDefault();
    setChgError("");

    if (newPassword.length < 6) {
      setChgError("新密码至少 6 位");
      return;
    }
    if (newPassword !== confirmPwd) {
      setChgError("两次输入的新密码不一致");
      return;
    }

    setChgLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        setChgError(data.error || "修改失败");
        return;
      }

      goRedirect();
    } catch {
      setChgError("网络错误，请重试");
    } finally {
      setChgLoading(false);
    }
  }

  // 强制改密界面
  if (needChangePwd) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800">
        <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-amber-500 rounded-xl flex items-center justify-center mb-4">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">请修改登录密码</h1>
            <p className="text-gray-500 mt-1 text-sm">首次登录需设置新密码（初始密码 Xc@123456）</p>
          </div>

          <form onSubmit={handleChangePwd} className="space-y-4">
            {chgError && (
              <div className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm">
                {chgError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="至少 6 位"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">确认新密码</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="再次输入新密码"
                required
              />
            </div>

            <button
              type="submit"
              disabled={chgLoading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {chgLoading ? "提交中..." : "确认修改并登录"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">新辰ERP</h1>
          <p className="text-gray-500 mt-1">留学业务管理系统</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="请输入用户名"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="请输入密码"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "登录中..." : "登 录"}
          </button>
        </form>
      </div>
    </div>
  );
}
