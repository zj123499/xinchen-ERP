"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, AlertCircle } from "lucide-react";

interface ComplaintItem { id: number; title: string; content: string | null; level: number; status: string; student: { name: string }; handler: { realName: string } | null; createdAt: string; }
interface StudentItem { id: number; name: string; }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "待处理", color: "bg-red-100 text-red-800" },
  PROCESSING: { label: "处理中", color: "bg-yellow-100 text-yellow-800" },
  RESOLVED: { label: "已解决", color: "bg-green-100 text-green-800" },
  CLOSED: { label: "已关闭", color: "bg-gray-100 text-gray-800" },
};
const LEVEL_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "高", color: "bg-red-100 text-red-800" },
  2: { label: "中", color: "bg-yellow-100 text-yellow-800" },
  3: { label: "低", color: "bg-gray-100 text-gray-800" },
};

export default function ComplaintsPage() {
  const [data, setData] = useState<ComplaintItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ studentId: "", title: "", content: "", level: "2" });
  const [formError, setFormError] = useState("");
  const [editItem, setEditItem] = useState<ComplaintItem | null>(null);
  const [editStatus, setEditStatus] = useState("");

  function fetchData() {
    setLoading(true);
    fetch("/api/complaints").then((r) => r.json()).then((d) => setData(d.list || [])).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { fetchData(); fetch("/api/students").then((r) => r.json()).then((d) => setStudents((d.list as StudentItem[]) || [])).catch(() => {}); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    if (!form.studentId || !form.title) { setFormError("学生和标题为必填项"); return; }
    const res = await fetch("/api/complaints", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { const r = await res.json(); setFormError(r.error || "失败"); return; }
    setShowForm(false); setForm({ studentId: "", title: "", content: "", level: "2" }); fetchData();
  }
  function openResolve(c: ComplaintItem) { setEditItem(c); setEditStatus(c.status === "OPEN" ? "PROCESSING" : "RESOLVED"); }
  async function handleResolve() {
    if (!editItem) return;
    await fetch(`/api/complaints/${editItem.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: editStatus }) });
    setEditItem(null); fetchData();
  }
  async function handleDelete(id: number) {
    await fetch(`/api/complaints/${id}`, { method: "DELETE" }); fetchData();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">投诉管理</h1><p className="text-sm text-gray-500 mt-1">投诉 → 处理 → 闭环</p></div>
        <button onClick={() => { setFormError(""); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> 新增投诉</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
          : data.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><AlertCircle className="w-12 h-12 mb-3 text-gray-300" /><p className="text-sm">暂无投诉</p></div>
            : <table className="w-full"><thead><tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">标题</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学生</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">等级</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">处理人</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">创建时间</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr></thead><tbody className="divide-y divide-gray-100">
              {data.map((c) => <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{c.title}</td>
                <td className="px-4 py-3 text-gray-600">{c.student.name}</td>
                <td className="px-4 py-3"><span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${LEVEL_LABELS[c.level]?.color || "bg-gray-100"}`}>{LEVEL_LABELS[c.level]?.label || c.level}</span></td>
                <td className="px-4 py-3"><span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_LABELS[c.status]?.color || "bg-gray-100"}`}>{STATUS_LABELS[c.status]?.label || c.status}</span></td>
                <td className="px-4 py-3 text-gray-600">{c.handler?.realName || "-"}</td>
                <td className="px-4 py-3 text-gray-500 text-sm">{new Date(c.createdAt).toLocaleDateString("zh-CN")}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {c.status !== "RESOLVED" && c.status !== "CLOSED" && <button onClick={() => openResolve(c)} className="px-2 py-1 text-xs text-green-700 bg-green-50 rounded hover:bg-green-100">处理</button>}
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>)}
            </tbody></table>}
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between"><h2 className="text-lg font-semibold">新增投诉</h2><button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">学生 <span className="text-red-500">*</span></label>
                <select required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">请选择</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">标题 <span className="text-red-500">*</span></label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">等级</label>
                  <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="1">高</option><option value="2">中</option><option value="3">低</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">内容</label><textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button><button type="submit" className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">提交</button></div>
            </form>
          </div>
        </div>
      )}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-semibold">处理投诉</h2></div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-700">投诉：<strong>{editItem.title}</strong></p>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              <div className="flex justify-end gap-3 pt-2"><button onClick={() => setEditItem(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button><button onClick={handleResolve} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">保存</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
