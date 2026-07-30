"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, ChevronLeft, ChevronRight, Server, ExternalLink } from "lucide-react";

interface ServerItem {
  id: number; name: string; address: string;
  account?: string | null; password?: string | null;
  description?: string | null; expiresAt?: string | null;
  status: boolean; createdAt: string;
}

function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) return null;
  return Math.ceil((d - Date.now()) / 86400000);
}

export default function ServersPage() {
  const [list, setList] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServerItem | null>(null);
  const [form, setForm] = useState({ name: "", address: "", account: "", password: "", description: "", expiresAt: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/servers");
      if (r.ok) {
        const d = await r.json();
        setList(d.list || []);
      }
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", address: "", account: "", password: "", description: "", expiresAt: "" });
    setError(""); setShowForm(true);
  }
  function openEdit(s: ServerItem) {
    setEditing(s);
    setForm({ name: s.name, address: s.address, account: s.account || "", password: s.password || "", description: s.description || "", expiresAt: s.expiresAt ? s.expiresAt.slice(0, 10) : "" });
    setError(""); setShowForm(true);
  }
  async function submit() {
    setError(""); setSubmitting(true);
    try {
      const url = editing ? `/api/servers/${editing.id}` : "/api/servers";
      const r = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!r.ok) { const d = await r.json(); setError(d.error || "失败"); return; }
      setShowForm(false); fetchData();
    } catch (e: any) { setError(e?.message || "网络错误"); }
    finally { setSubmitting(false); }
  }
  async function del(s: ServerItem) {
    if (!confirm(`确定删除服务器「${s.name}」？`)) return;
    await fetch(`/api/servers/${s.id}`, { method: "DELETE" });
    fetchData();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">服务器</h1>
          <p className="text-sm text-gray-500 mt-1">管理服务器地址、账号及到期时间</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" />新增服务器</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">地址</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">账号</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">说明</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">到期时间</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">加载中...</td></tr>
            ) : !list.length ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">暂无数据</td></tr>
            ) : list.map(s => {
              const days = daysUntil(s.expiresAt);
              const isExpiring = days !== null && days <= 30;
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-700">{s.address}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.account || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={s.description || ""}>{s.description || "-"}</td>
                  <td className={`px-4 py-3 text-sm ${isExpiring ? "text-red-600 font-bold" : "text-gray-600"}`}>
                    {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString("zh-CN") : "-"}
                    {days !== null && days <= 30 && <span className="text-xs ml-1">({days}天{days < 0 ? "已过期" : ""})</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="编辑"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => del(s)} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="删除"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">{editing ? "编辑服务器" : "新增服务器"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-3">
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">名称 <span className="text-red-500">*</span></label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="如:阿里云主机" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">服务器地址 <span className="text-red-500">*</span></label><input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="IP 或域名" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">账号</label><input type="text" value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">密码</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">说明</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} placeholder="用途、配置等" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">到期时间</label><input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button onClick={submit} disabled={submitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50">{submitting ? "保存中..." : "保存"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}