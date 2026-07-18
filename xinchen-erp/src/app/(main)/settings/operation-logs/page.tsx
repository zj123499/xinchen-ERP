"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, ChevronLeft, ChevronRight, ListChecks, Eye, X,
} from "lucide-react";

interface LogItem {
  id: number;
  module: string;
  action: string;
  target?: string;
  detail?: any;
  operatorName: string;
  ipAddress?: string;
  createdAt: string;
}

interface Response {
  total: number; page: number; pageSize: number; totalPages: number;
  list: LogItem[];
  filters: { modules: string[]; actions: string[] };
}

const ACTION_COLOR: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  EXPORT: "bg-amber-100 text-amber-700",
  IMPORT: "bg-purple-100 text-purple-700",
  APPROVE: "bg-teal-100 text-teal-700",
  LOGIN: "bg-indigo-100 text-indigo-700",
};

export default function OperationLogsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [detail, setDetail] = useState<LogItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "30" });
      if (moduleFilter) params.set("module", moduleFilter);
      if (actionFilter) params.set("action", actionFilter);
      if (keyword) params.set("keyword", keyword);
      const res = await fetch(`/api/operation-logs?` + params.toString());
      setData(await res.json());
    } catch { console.error("加载失败"); } finally { setLoading(false); }
  }, [page, moduleFilter, actionFilter, keyword]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">操作日志</h1>
        <p className="text-sm text-gray-500 mt-1">记录用户在系统中的关键操作（增删改、导出、导入等），便于行为追溯</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={moduleFilter} onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部模块</option>
            {(data?.filters.modules || []).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部动作</option>
            {(data?.filters.actions || []).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            placeholder="搜索操作对象"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-52" />
          <button onClick={() => { setModuleFilter(""); setActionFilter(""); setKeyword(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="重置"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
        ) : !data || data.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <ListChecks className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无操作日志</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作人</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">模块</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">动作</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作对象</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">IP</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">时间</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{l.operatorName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{l.module}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLOR[l.action] || "bg-gray-100 text-gray-600"}`}>{l.action}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{l.target || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{l.ipAddress || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(l.createdAt).toLocaleString("zh-CN")}</td>
                    <td className="px-4 py-3">
                      {l.detail ? (
                        <button onClick={() => setDetail(l)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="查看详情"><Eye className="w-4 h-4" /></button>
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
              <h2 className="text-lg font-semibold text-gray-900">操作详情 · {detail.module} / {detail.action}</h2>
              <button onClick={() => setDetail(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-3">操作对象：{detail.target || "-"}</p>
              <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-80 whitespace-pre-wrap break-all">{detail.detail ? JSON.stringify(detail.detail, null, 2) : "无补充信息"}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
