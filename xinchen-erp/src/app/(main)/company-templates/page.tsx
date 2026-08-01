"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";

interface Template {
  id: number; name: string;
  cloudAccount?: string | null; cloudAccountPassword?: string | null;
  cloudLoginPhone?: string | null; icpCompany?: string | null;
  legalRepresentative?: string | null; remark?: string | null;
}

export default function CompanyTemplatesPage() {
  const [list, setList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: "", cloudAccount: "", cloudAccountPassword: "", cloudLoginPhone: "", icpCompany: "", legalRepresentative: "", remark: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/company-templates");
      if (r.ok) {
        const d = await r.json();
        setList(d.list || []);
        setTotal(d.total || 0);
      }
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", cloudAccount: "", cloudAccountPassword: "", cloudLoginPhone: "", icpCompany: "", legalRepresentative: "", remark: "" });
    setError(""); setShowForm(true);
  }
  function openEdit(t: Template) {
    setEditing(t);
    setForm({ name: t.name, cloudAccount: t.cloudAccount || "", cloudAccountPassword: t.cloudAccountPassword || "", cloudLoginPhone: t.cloudLoginPhone || "", icpCompany: t.icpCompany || "", legalRepresentative: t.legalRepresentative || "", remark: t.remark || "" });
    setError(""); setShowForm(true);
  }

  async function submit() {
    setError(""); setSubmitting(true);
    try {
      const url = editing ? `/api/company-templates/${editing.id}` : "/api/company-templates";
      const r = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!r.ok) { const d = await r.json(); setError(d.error || "失败"); return; }
      setShowForm(false); fetchData();
    } catch (e: any) { setError(e?.message || "网络错误"); }
    finally { setSubmitting(false); }
  }

  async function del(t: Template) {
    if (!confirm(`确定删除模板「${t.name}」？`)) return;
    await fetch(`/api/company-templates/${t.id}`, { method: "DELETE" });
    fetchData();
  }

  const totalPages = Math.ceil(total / pageSize);
  const pagedList = list.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">公司模板</h1>
          <p className="text-sm text-slate-500 mt-1">统一管理云账号、备案公司等共享信息，站点一键引用</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-5 h-5" />新增模板</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">模板名称</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">云账号</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">验证手机</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">备案公司</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">法人代表</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">加载中...</td></tr>
            ) : !pagedList.length ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">暂无数据</td></tr>
            ) : pagedList.map(t => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{t.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{t.cloudAccount || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{t.cloudLoginPhone || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{t.icpCompany || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{t.legalRepresentative || "-"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="编辑"><Edit3 className="w-5 h-5" /></button>
                  <button onClick={() => del(t)} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="删除"><Trash2 className="w-5 h-5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t bg-slate-50 text-sm text-slate-500">
            <span>共 {total} 条</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 border rounded disabled:opacity-50"><ChevronLeft className="w-5 h-5" /></button>
              <span className="px-3">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 border rounded disabled:opacity-50"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">{editing ? "编辑模板" : "新增模板"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-3">
              {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
              <div><label className="block text-sm font-medium text-slate-700 mb-1">模板名称 <span className="text-red-500">*</span></label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="如：总公司模板" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">云账号</label><input type="text" value={form.cloudAccount} onChange={e => setForm(f => ({ ...f, cloudAccount: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">密码</label><input type="password" value={form.cloudAccountPassword} onChange={e => setForm(f => ({ ...f, cloudAccountPassword: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">登录验证手机</label><input type="text" value={form.cloudLoginPhone} onChange={e => setForm(f => ({ ...f, cloudLoginPhone: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">备案公司</label><input type="text" value={form.icpCompany} onChange={e => setForm(f => ({ ...f, icpCompany: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">法人代表</label><input type="text" value={form.legalRepresentative} onChange={e => setForm(f => ({ ...f, legalRepresentative: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">备注</label><textarea value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button onClick={submit} disabled={submitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50">{submitting ? "保存中..." : "保存"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}