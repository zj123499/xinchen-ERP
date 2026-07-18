"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, PhoneCall } from "lucide-react";

interface VisitItem { id: number; visitDate: string; channel: string | null; result: string; summary: string | null; nextPlan: string | null; student: { name: string }; visitor: { realName: string }; }
interface StudentItem { id: number; name: string; }

const RESULT_LABELS: Record<string, { label: string; color: string }> = {
  NORMAL: { label: "正常", color: "bg-green-100 text-green-800" },
  RISK: { label: "风险", color: "bg-red-100 text-red-800" },
  COMPLAINT: { label: "投诉", color: "bg-orange-100 text-orange-800" },
  REFERRAL_INTENT: { label: "转介绍意向", color: "bg-blue-100 text-blue-800" },
};

export default function ServiceVisitsPage() {
  const [data, setData] = useState<VisitItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ studentId: "", visitDate: "", channel: "PHONE", result: "NORMAL", summary: "", nextPlan: "" });
  const [formError, setFormError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<VisitItem | null>(null);

  function fetchData() {
    setLoading(true);
    fetch("/api/service-visits").then((r) => r.json()).then((d) => setData(d.list || [])).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { fetchData(); fetch("/api/students").then((r) => r.json()).then((d) => setStudents((d.list as StudentItem[]) || [])).catch(() => {}); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    if (!form.studentId) { setFormError("请选择学生"); return; }
    const res = await fetch("/api/service-visits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { const r = await res.json(); setFormError(r.error || "失败"); return; }
    setShowForm(false); setForm({ studentId: "", visitDate: "", channel: "PHONE", result: "NORMAL", summary: "", nextPlan: "" }); fetchData();
  }
  async function handleDelete() {
    if (!deleteConfirm) return;
    await fetch(`/api/service-visits/${deleteConfirm.id}`, { method: "DELETE" });
    setDeleteConfirm(null); fetchData();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">服务回访</h1><p className="text-sm text-gray-500 mt-1">定期回访记录，识别风险与转介绍机会</p></div>
        <button onClick={() => { setFormError(""); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> 新增回访</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
          : data.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><PhoneCall className="w-12 h-12 mb-3 text-gray-300" /><p className="text-sm">暂无回访记录</p></div>
            : <table className="w-full"><thead><tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学生</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">回访人</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">日期</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">结果</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">摘要</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr></thead><tbody className="divide-y divide-gray-100">
              {data.map((v) => <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{v.student.name}</td>
                <td className="px-4 py-3 text-gray-600">{v.visitor.realName}</td>
                <td className="px-4 py-3 text-gray-500 text-sm">{new Date(v.visitDate).toLocaleDateString("zh-CN")}</td>
                <td className="px-4 py-3"><span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${RESULT_LABELS[v.result]?.color || "bg-gray-100"}`}>{RESULT_LABELS[v.result]?.label || v.result}</span></td>
                <td className="px-4 py-3 text-gray-500 text-sm max-w-[220px] truncate">{v.summary || "-"}</td>
                <td className="px-4 py-3"><button onClick={() => setDeleteConfirm(v)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button></td>
              </tr>)}
            </tbody></table>}
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between"><h2 className="text-lg font-semibold">新增回访</h2><button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">学生 <span className="text-red-500">*</span></label>
                <select required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">请选择</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">回访日期</label><input value={form.visitDate} onChange={(e) => setForm({ ...form, visitDate: e.target.value })} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">渠道</label>
                  <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="PHONE">电话</option><option value="WECHAT">微信</option><option value="FACE_TO_FACE">面谈</option><option value="VIDEO">视频</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">结果</label>
                <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {Object.entries(RESULT_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">摘要</label><textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">下一步计划</label><textarea value={form.nextPlan} onChange={(e) => setForm({ ...form, nextPlan: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button><button type="submit" className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">保存</button></div>
            </form>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
          <div className="px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-xl"><h2 className="text-lg font-semibold text-red-800">确认删除</h2></div>
          <div className="p-6"><p className="text-sm text-gray-700">确定删除该回访记录？</p><div className="flex justify-end gap-3 mt-4"><button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button><button onClick={handleDelete} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">确认</button></div></div></div></div>
      )}
    </div>
  );
}
