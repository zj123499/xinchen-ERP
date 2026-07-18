"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Trash2, Edit2, RefreshCw } from "lucide-react";

interface MajorItem {
  id: number;
  name: string;
  category: string | null;
  degreeLevel: string;
  duration: string | null;
  tuition: number | null;
  institution: { id: number; name: string };
  country: { id: number; name: string } | null;
}
interface InstitutionItem { id: number; name: string; }

const DEGREE_LABELS: Record<string, string> = {
  BACHELOR: "本科", MASTER: "硕士", PHD: "博士", DIPLOMA: "文凭", FOUNDATION: "预科", LANGUAGE: "语言",
};

export default function MajorsPage() {
  const [data, setData] = useState<MajorItem[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [instFilter, setInstFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MajorItem | null>(null);
  const [form, setForm] = useState({ name: "", institutionId: "", category: "", degreeLevel: "MASTER", duration: "", language: "", tuition: "", remark: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<MajorItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set("keyword", keyword);
      if (instFilter) params.set("institutionId", instFilter);
      const res = await fetch(`/api/majors?${params.toString()}`);
      const result = await res.json();
      setData(result.list || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [keyword, instFilter]);

  useEffect(() => {
    fetchData();
    fetch("/api/institutions").then((r) => r.json()).then((d) => setInstitutions(d.list || [])).catch(() => {});
  }, [fetchData]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", institutionId: institutions[0]?.id?.toString() || "", category: "", degreeLevel: "MASTER", duration: "", language: "", tuition: "", remark: "" });
    setFormError(""); setShowForm(true);
  }
  function openEdit(m: MajorItem) {
    setEditing(m);
    setForm({ name: m.name, institutionId: m.institution.id.toString(), category: m.category || "", degreeLevel: m.degreeLevel, duration: m.duration || "", language: "", tuition: m.tuition?.toString() || "", remark: "" });
    setFormError(""); setShowForm(true);
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setFormError("");
    try {
      const url = editing ? `/api/majors/${editing.id}` : "/api/majors";
      const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await res.json();
      if (!res.ok) { setFormError(result.error || "保存失败"); return; }
      setShowForm(false); fetchData();
    } catch { setFormError("网络错误"); } finally { setSubmitting(false); }
  }
  async function handleDelete() {
    if (!deleteConfirm) return;
    await fetch(`/api/majors/${deleteConfirm.id}`, { method: "DELETE" });
    setDeleteConfirm(null); fetchData();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">专业管理</h1>
          <p className="text-sm text-gray-500 mt-1">院校下属专业与录取要求</p></div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> 新增专业</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索专业名称"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <select value={instFilter} onChange={(e) => setInstFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">全部院校</option>{institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
          <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 rounded-lg text-sm"><RefreshCw className="w-4 h-4" /> 刷新</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
          : data.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><p className="text-sm">暂无专业数据</p>
            <button onClick={openNew} className="mt-3 text-blue-600 text-sm hover:underline">添加第一个专业</button></div>
            : <table className="w-full"><thead><tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">专业</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">院校</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">类别</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学位</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学制</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学费</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr></thead><tbody className="divide-y divide-gray-100">
              {data.map((m) => <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                <td className="px-4 py-3 text-gray-600">{m.institution?.name}</td>
                <td className="px-4 py-3 text-gray-600">{m.category || "-"}</td>
                <td className="px-4 py-3"><span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{DEGREE_LABELS[m.degreeLevel] || m.degreeLevel}</span></td>
                <td className="px-4 py-3 text-gray-600">{m.duration || "-"}</td>
                <td className="px-4 py-3 text-gray-600">{m.tuition != null ? `¥${m.tuition}` : "-"}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-1">
                  <button onClick={() => openEdit(m)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteConfirm(m)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>)}
            </tbody></table>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? "编辑专业" : "新增专业"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">专业名称 <span className="text-red-500">*</span></label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">院校 <span className="text-red-500">*</span></label>
                  <select required value={form.institutionId} onChange={(e) => setForm({ ...form, institutionId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">请选择</option>{institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">学位</label>
                  <select value={form.degreeLevel} onChange={(e) => setForm({ ...form, degreeLevel: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {Object.entries(DEGREE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">类别</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="如 商科/工科" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">学制</label>
                  <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="如 1年/2年" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">学费</label>
                <input value={form.tuition} onChange={(e) => setForm({ ...form, tuition: e.target.value })} type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
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
            <div className="p-6"><p className="text-sm text-gray-700">确定删除专业 <strong>{deleteConfirm.name}</strong>？</p>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button onClick={handleDelete} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">确认删除</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
}
