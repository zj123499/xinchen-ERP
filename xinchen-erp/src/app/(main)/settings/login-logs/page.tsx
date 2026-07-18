"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, ChevronLeft, ChevronRight, LogIn,
} from "lucide-react";

interface LogItem {
  id: number;
  username?: string;
  status: string;
  reason?: string;
  operatorName: string;
  ipAddress?: string;
  createdAt: string;
}

interface Response {
  total: number; page: number; pageSize: number; totalPages: number;
  list: LogItem[];
  filters: { statuses: string[] };
}

const STATUS_COLOR: Record<string, string> = {
  SUCCESS: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

export default function LoginLogsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [keyword, setKeyword] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "30" });
      if (statusFilter) params.set("status", statusFilter);
      if (keyword) params.set("keyword", keyword);
      const res = await fetch(`/api/login-logs?` + params.toString());
      setData(await res.json());
    } catch { console.error("加载失败"); } finally { setLoading(false); }
  }, [page, statusFilter, keyword]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">登录日志</h1>
        <p className="text-sm text-gray-500 mt-1">记录所有登录尝试（成功/失败），用于安全审计与异常登录排查</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部状态</option>
            {(data?.filters.statuses || []).map((s) => <option key={s} value={s}>{s === "SUCCESS" ? "成功" : "失败"}</option>)}
          </select>
          <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            placeholder="搜索用户名"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-52" />
          <button onClick={() => { setStatusFilter(""); setKeyword(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="重置"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
        ) : !data || data.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <LogIn className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无登录日志</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">用户名</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">说明</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">IP</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{l.username || l.operatorName || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[l.status] || "bg-gray-100 text-gray-600"}`}>
                        {l.status === "SUCCESS" ? "成功" : "失败"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{l.reason || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{l.ipAddress || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(l.createdAt).toLocaleString("zh-CN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-sm text-gray-500">共 {data.total} 条，第 {data.page}/{data.totalPages} 页</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, data.totalPages - 4));
                  const p = start + i;
                  if (p > data.totalPages) return null;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 text-sm rounded transition ${p === page ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}>{p}</button>
                  );
                })}
                <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                  className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
