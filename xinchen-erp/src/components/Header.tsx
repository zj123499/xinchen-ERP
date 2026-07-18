"use client";

import { Bell, User, LogOut, Check, X, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface Notification {
  id: number;
  title: string;
  content: string | null;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
  readAt: string | null;
}

const TYPE_STYLES: Record<string, { color: string; label: string }> = {
  info: { color: "text-blue-600 bg-blue-50", label: "信息" },
  success: { color: "text-green-600 bg-green-50", label: "成功" },
  warning: { color: "text-orange-600 bg-orange-50", label: "警告" },
  error: { color: "text-red-600 bg-red-50", label: "错误" },
  task: { color: "text-purple-600 bg-purple-50", label: "任务" },
};

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString("zh-CN");
}

export default function Header() {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // 获取未读数
  async function fetchUnreadCount() {
    try {
      const res = await fetch("/api/notifications?unreadOnly=true&limit=1");
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // 静默失败
    }
  }

  // 获取通知列表
  async function fetchNotifications() {
    setLoadingNotif(true);
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.list || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // 静默失败
    } finally {
      setLoadingNotif(false);
    }
  }

  // 初始加载未读数 + 定时刷新
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // 每分钟刷新
    return () => clearInterval(interval);
  }, []);

  // 点击外部关闭面板
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 打开通知面板时加载数据
  function toggleNotifications() {
    const next = !showNotifications;
    setShowNotifications(next);
    setShowUserMenu(false);
    if (next && notifications.length === 0) {
      fetchNotifications();
    }
  }

  // 标记单条已读
  async function markAsRead(id: number, link: string | null) {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (link) {
        router.push(link);
        setShowNotifications(false);
      }
    } catch {
      // 静默失败
    }
  }

  // 全部标记已读
  async function markAllAsRead() {
    try {
      await fetch("/api/notifications/read-all", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // 静默失败
    }
  }

  // 删除通知
  async function deleteNotification(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // 静默失败
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="fixed left-[240px] right-0 top-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-20">
      <div className="text-sm text-gray-500">欢迎回来，祝您工作愉快！</div>

      <div className="flex items-center gap-4">
        {/* 通知铃铛 */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={toggleNotifications}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-96 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
              {/* 头部 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900 text-sm">消息通知</span>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{unreadCount} 条未读</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />全部已读
                  </button>
                )}
              </div>

              {/* 通知列表 */}
              <div className="max-h-96 overflow-y-auto">
                {loadingNotif ? (
                  <div className="py-8 text-center text-gray-400 text-sm">加载中...</div>
                ) : notifications.length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <Bell className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                    <p className="text-sm">暂无通知</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const style = TYPE_STYLES[n.type] || TYPE_STYLES.info;
                    return (
                      <div
                        key={n.id}
                        onClick={() => !n.isRead && markAsRead(n.id, n.link)}
                        className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer group relative ${!n.isRead ? "bg-blue-50/30" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          {/* 未读标记 */}
                          <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.isRead ? "bg-gray-200" : "bg-blue-500"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${style.color}`}>{style.label}</span>
                              <span className="text-xs text-gray-400">{formatTime(n.createdAt)}</span>
                              {n.link && <ExternalLink className="w-3 h-3 text-gray-300" />}
                            </div>
                            <p className={`text-sm ${n.isRead ? "text-gray-500" : "text-gray-900 font-medium"}`}>{n.title}</p>
                            {n.content && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{n.content}</p>}
                          </div>
                          <button
                            onClick={(e) => deleteNotification(n.id, e)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1 rounded transition flex-shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* 用户菜单 */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-gray-700">管理员</span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-12 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              <button
                onClick={() => { setShowUserMenu(false); router.push("/settings/profile"); }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <User className="w-4 h-4" /> 个人设置
              </button>
              <hr className="my-1" />
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> 退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
