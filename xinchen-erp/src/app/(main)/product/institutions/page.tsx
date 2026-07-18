"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Trash2, Edit2, RefreshCw } from "lucide-react";

interface InstitutionItem {
  id: number;
  name: string;
  type: string;
  ranking: number | null;
  tuitionRange: string | null;
  country: { id: number; name: string };
  _count: { majors: number };
}
interface CountryItem { id: number; name: string; }

const TYPE_LABELS: Record<string, string> = {
  UNIVERSITY: "大学", COLLEGE: "学院", SCHOOL: "中学", LANGUAGE_CENTER: "语言中心",
};

export default function InstitutionsPage() {
  const [data, setData] = useState<InstitutionItem[]>([]);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InstitutionItem | null>(null);
  const [form, setForm] = useState({ name: "", countryId: "", type: "UNIVERSITY", ranking: "", tuitionRange: "", remark: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<InstitutionItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set("keyword", keyword);
      if (countryFilter) params.set("countryId", countryFilter);
      const res = await fetch(`/api/institutions?${params.toString()}`);
      const result = await res.json();
      setData(result.list || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [keyword, countryFilter]);

  useEffect(() => {
    fetchData();
    fetch("/api/countries").then((r) => r.json()).then((d) => setCountries(d.list || [])).catch(() => {});
  }, [fetchData]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", countryId: countries[0]?.id?.toString() || "", type: "UNIVERSITY", ranking: "", tuitionRange: "", remark: "" });
    setFormError("");
    setShowForm(true);
  }
  function openEdit(i: InstitutionItem) {
    setEditing(i);
    setForm({ name: i.name, countryId: i.country.id.toString(), type: i.type, ranking: i.ranking?.toString() || "", tuitionRange: i.tuitionRange || "", remark: "" });
    setFormError("");
    setShowForm(true);
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setFormError("");
    try {
      const url = editing ? `/api/institutions/${editing.id}` : "/api/institutions";
      const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await res.json();
      if (!res.ok) { setFormError(result.error || "保存失败"); return; }
      setShowForm(false); fetchData();
    } catch { setFormError("网络错误"); } finally { setSubmitting(false); }
  }
  async function handleDelete() {
    if (!deleteConfirm) return;
    await fetch(`/api/institutions/${deleteConfirm.id}`, { method: "DELETE" });
    setDeleteConfirm(null); fetchData();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">院校管理</h1>
          <p className="text-sm text-gray-500 mt-1">维护院校库，支撑选校与报价</p></div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> 新增院校</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索院校名称"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">全部国家</option>{countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 rounded-lg text-sm"><RefreshCw className="w-4 h-4" /> 刷新</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
          : data.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><p className="text-sm">暂无院校数据</p>
            <button onClick={openNew} className="mt-3 text-blue-600 text-sm hover:underline">添加第一个院校</button></div>
            : <table className="w-full"><thead><tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">院校</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">国家</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">类型</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">排名</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学费区间</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">专业数</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr></thead><tbody className="divide-y divide-gray-100">
              {data.map((i) => <tr key={i.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                <td className="px-4 py-3 text-gray-600">{i.country?.name}</td>
                <td className="px-4 py-3"><span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{TYPE_LABELS[i.type] || i.type}</span></td>
                <td className="px-4 py-3 text-gray-600">{i.ranking ?? "-"}</td>
                <td className="px-4 py-3 text-gray-600">{i.tuitionRange || "-"}</td>
                <td className="px-4 py-3 text-gray-600">{i._count.majors}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-1">
                  <button onClick={() => openEdit(i)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteConfirm(i)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>)}
            </tbody></table>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? "编辑院校" : "新增院校"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">院校名称 <span className="text-red-500">*</span></label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">国家 <span className="text-red-500">*</span></label>
                  <select required value={form.countryId} onChange={(e) => setForm({ ...form, countryId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">请选择</option>{countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">排名</label>
                  <input value={form.ranking} onChange={(e) => setForm({ ...form, ranking: e.target.value })} type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">学费区间</label>
                  <input value={form.tuitionRange} onChange={(e) => setForm({ ...form, tuitionRange: e.target.value })} placeholder="如 3-5万/年" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              </div>
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
            <div className="p-6"><p className="text-sm text-gray-700">确定删除院校 <strong>{deleteConfirm.name}</strong>？相关专也将一并删除。</p>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button onClick={handleDelete} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">确认删除</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
}
