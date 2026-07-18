"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Search, Layers, History } from "lucide-react";

interface VersionItem {
  id: number;
  configType: string;
  configKey: string;
  version: number;
  snapshot: any;
  remark?: string | null;
  operatorId?: number | null;
  isActive: boolean;
  createdAt: string;
}

const TYPE_MAP: Record<string, string> = {
  COMMISSION_RULE: "提成规则",
  WORKFLOW: "工作流",
  FORM_SCHEMA: "表单结构",
  SYSTEM_CONFIG: "系统参数",
};

export default function ConfigVersionsPage() {
  const [data, setData] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [viewVersion, setViewVersion] = useState<VersionItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (typeFilter) params.set("configType", typeFilter);
      if (activeOnly) params.set("activeOnly", "true");
      const res = await fetch(`/api/config-versions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      setData(d.list || []);
    } catch {
      console.error("获取配置版本失败");
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, activeOnly]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">配置版本</h1>
          <p className="text-sm text-gray-500 mt-1">统一管理提成规则等核心配置的历史版本快照</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部类型</option>
            {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={activeOnly} onChange={(e) => { setActiveOnly(e.target.checked); setPage(1); }} />
            仅看生效版本
          </label>
          <button onClick={() => fetchData()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Layers className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无配置版本记录</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">配置标识</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">版本</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">说明</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">创建时间</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.configKey}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{TYPE_MAP[v.configType] || v.configType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">v{v.version}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${v.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {v.isActive ? "生效中" : "历史"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{v.remark || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(v.createdAt).toLocaleString("zh-CN")}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setViewVersion(v)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="查看快照"><History className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {viewVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">配置快照 · {viewVersion.configKey} v{viewVersion.version}</h2>
              <button onClick={() => setViewVersion(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition">✕</button>
            </div>
            <div className="p-6">
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(viewVersion.snapshot, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
