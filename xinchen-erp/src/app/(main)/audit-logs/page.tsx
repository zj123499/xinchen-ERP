"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, ChevronLeft, ChevronRight, ShieldCheck, Eye, X,
} from "lucide-react";

interface LogItem {
  id: number;
  action: string;
  tableName?: string;
  recordId?: number;
  operatorName: string;
  ipAddress?: string;
  beforeData?: any;
  afterData?: any;
  createdAt: string;
}

interface Response {
  total: number; page: number; pageSize: number; totalPages: number;
  list: LogItem[];
  filters: { actions: string[]; tables: string[] };
}

const ACTION_COLOR: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN: "bg-purple-100 text-purple-700",
  EXPORT: "bg-amber-100 text-amber-700",
};

export default function AuditLogsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [detail, setDetail] = useState<LogItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "30" });
      if (actionFilter) params.set("action", actionFilter);
      if (tableFilter) params.set("tableName", tableFilter);
      const res = await fetch(`/api/audit-logs?` + params.toString());
      setData(await res.json());
    } catch { console.error("加载失败"); } finally { setLoading(false); }
  }, [page, actionFilter, tableFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">操作审计日志</h1>
        <p className="text-sm text-gray-500 mt-1">记录系统所有关键操作，支持合规追溯与安全审计</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部操作</option>
            {(data?.filters.actions || []).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={tableFilter} onChange={(e) => { setTableFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部数据表</option>
            {(data?.filters.tables || []).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => { setActionFilter(""); setTableFilter(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
        ) : !data || data.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <ShieldCheck className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无审计日志</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作人</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">数据表</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">记录ID</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">IP</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">时间</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{l.operatorName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLOR[l.action] || "bg-gray-100 text-gray-600"}`}>{l.action}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{l.tableName || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{l.recordId ?? "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{l.ipAddress || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(l.createdAt).toLocaleString("zh-CN")}</td>
                    <td className="px-4 py-3">
                      {(l.beforeData || l.afterData) ? (
                        <button onClick={() => setDetail(l)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="查看变更"><Eye className="w-4 h-4" /></button>
                      ) : <span className="text-xs text-gray-300">-</span>}
                    </td>
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

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">变更详情 · {detail.action} {detail.tableName}</h2>
              <button onClick={() => setDetail(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">变更前</h3>
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-80 whitespace-pre-wrap break-all">{detail.beforeData ? JSON.stringify(detail.beforeData, null, 2) : "无"}</pre>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">变更后</h3>
                <pre className="text-xs bg-green-50 border border-green-200 rounded-lg p-3 overflow-auto max-h-80 whitespace-pre-wrap break-all">{detail.afterData ? JSON.stringify(detail.afterData, null, 2) : "无"}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
