"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDingtalk, setIsDingtalk] = useState(false);

  // 检测是否在钉钉环境中
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("dingtalk")) {
      setIsDingtalk(true);
    }
  }, []);

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

      // 使用 window.location.replace 做硬跳转（不在历史记录中留登录页）
      // 加上时间戳防止浏览器使用缓存的旧 HTML
      const redirectTo = new URLSearchParams(window.location.search).get("redirect") || "/";
      const separator = redirectTo.includes("?") ? "&" : "?";
      window.location.replace(`${redirectTo}${separator}t=${Date.now()}`);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  /**
   * 钉钉免登
   * 通过钉钉 JSAPI 获取 authCode 并调用后端登录接口
   */
  async function handleDingtalkLogin() {
    setError("");
    setLoading(true);

    try {
      // 钉钉免登：通过 dd.runtime.permission.requestAuthCode 获取 authCode
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dd = (window as any).dd;

      if (dd) {
        dd.runtime?.permission?.requestAuthCode?.({
          corpId: "dingqezcuwre7fic84kr",
          onSuccess: async (result: { code: string }) => {
            const res = await fetch("/api/dingtalk/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ authCode: result.code }),
            });

            if (!res.ok) {
              const data = await res.json();
              setError(data.error || "钉钉登录失败");
              setLoading(false);
              return;
            }

            const redirectTo = new URLSearchParams(window.location.search).get("redirect") || "/";
            const separator = redirectTo.includes("?") ? "&" : "?";
            window.location.replace(`${redirectTo}${separator}t=${Date.now()}`);
          },
          onFail: (err: Error) => {
            setError("钉钉授权失败: " + (err?.message || "未知错误"));
            setLoading(false);
          },
        });
      } else {
        setError("请在钉钉客户端中打开");
        setLoading(false);
      }
    } catch {
      setError("钉钉登录失败");
      setLoading(false);
    }
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

        {isDingtalk && (
          <div className="mb-6">
            <button
              type="button"
              onClick={handleDingtalkLogin}
              disabled={loading}
              className="w-full py-2.5 bg-[#0089FF] text-white rounded-lg font-medium hover:bg-[#0073d8] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.5h-2.5l-1-2.5h-2l-1 2.5H7.5L10 7h4l2.5 9.5zM11.5 9l-1 3h3l-1-3h-1z"/>
              </svg>
              {loading ? "登录中..." : "钉钉免登"}
            </button>
            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-3 text-gray-400 text-sm">或使用账号密码</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>
          </div>
        )}

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
