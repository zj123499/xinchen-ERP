"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Trash2, Edit2, RefreshCw } from "lucide-react";

interface CountryItem {
  id: number;
  name: string;
  code: string;
  region: string | null;
  remark: string | null;
  _count: { institutions: number; products: number };
  createdAt: string;
}

export default function CountriesPage() {
  const [data, setData] = useState<CountryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CountryItem | null>(null);
  const [form, setForm] = useState({ name: "", code: "", region: "", remark: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<CountryItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "20");
      if (keyword) params.set("keyword", keyword);
      const res = await fetch(`/api/countries?${params.toString()}`);
      const result = await res.json();
      setData(result.list || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", code: "", region: "", remark: "" });
    setFormError("");
    setShowForm(true);
  }
  function openEdit(c: CountryItem) {
    setEditing(c);
    setForm({ name: c.name, code: c.code, region: c.region || "", remark: c.remark || "" });
    setFormError("");
    setShowForm(true);
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const url = editing ? `/api/countries/${editing.id}` : "/api/countries";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) { setFormError(result.error || "保存失败"); return; }
      setShowForm(false);
      fetchData();
    } catch { setFormError("网络错误"); }
    finally { setSubmitting(false); }
  }
  async function handleDelete() {
    if (!deleteConfirm) return;
    await fetch(`/api/countries/${deleteConfirm.id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchData();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">国家管理</h1>
          <p className="text-sm text-gray-500 mt-1">业务知识库底层：国家 → 院校 → 专业 → 产品</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4" /> 新增国家
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              placeholder="搜索国家名称/代码/地区"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
            <RefreshCw className="w-4 h-4" /> 刷新
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-sm">暂无国家数据</p>
            <button onClick={openNew} className="mt-3 text-blue-600 text-sm hover:underline">添加第一个国家</button>
          </div>
        ) : (
          <table className="w-full">
            <thead><tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">国家</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">代码</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">地区</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">院校/产品</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">备注</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.code}</td>
                  <td className="px-4 py-3 text-gray-600">{c.region || "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{c._count.institutions} 院校 / {c._count.products} 产品</td>
                  <td className="px-4 py-3 text-gray-500 text-sm max-w-[200px] truncate">{c.remark || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteConfirm(c)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? "编辑国家" : "新增国家"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">国家名称 <span className="text-red-500">*</span></label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">代码 <span className="text-red-500">*</span></label>
                  <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="如 MY / UK / AU" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">地区</label>
                <input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? "保存中..." : "保存"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-xl"><h2 className="text-lg font-semibold text-red-800">确认删除</h2></div>
            <div className="p-6">
              <p className="text-sm text-gray-700">确定删除国家 <strong>{deleteConfirm.name}</strong>？</p>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button onClick={handleDelete} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">确认删除</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
