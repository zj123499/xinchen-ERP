"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, Share2 } from "lucide-react";

interface ReferralItem { id: number; refereeName: string; refereePhone: string | null; rewardType: string | null; rewardAmount: number | null; status: string; referrer: { name: string }; newStudent: { name: string } | null; createdAt: string; }
interface StudentItem { id: number; name: string; }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待转化", color: "bg-yellow-100 text-yellow-800" },
  CONVERTED: { label: "已转化", color: "bg-blue-100 text-blue-800" },
  REWARDED: { label: "已奖励", color: "bg-green-100 text-green-800" },
  INVALID: { label: "无效", color: "bg-gray-100 text-gray-800" },
};

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ referrerId: "", refereeName: "", refereePhone: "", rewardType: "", rewardAmount: "" });
  const [formError, setFormError] = useState("");
  const [editItem, setEditItem] = useState<ReferralItem | null>(null);
  const [editStatus, setEditStatus] = useState("");

  function fetchData() {
    setLoading(true);
    fetch("/api/referrals").then((r) => r.json()).then((d) => setData(d.list || [])).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { fetchData(); fetch("/api/students").then((r) => r.json()).then((d) => setStudents((d.list as StudentItem[]) || [])).catch(() => {}); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    if (!form.referrerId || !form.refereeName) { setFormError("推荐人和被推荐人姓名为必填项"); return; }
    const res = await fetch("/api/referrals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { const r = await res.json(); setFormError(r.error || "失败"); return; }
    setShowForm(false); setForm({ referrerId: "", refereeName: "", refereePhone: "", rewardType: "", rewardAmount: "" }); fetchData();
  }
  function openUpdate(r: ReferralItem) { setEditItem(r); setEditStatus(r.status); }
  async function handleUpdate() {
    if (!editItem) return;
    await fetch(`/api/referrals/${editItem.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: editStatus }) });
    setEditItem(null); fetchData();
  }
  async function handleDelete(id: number) { await fetch(`/api/referrals/${id}`, { method: "DELETE" }); fetchData(); }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">转介绍</h1><p className="text-sm text-gray-500 mt-1">老生推荐新生，签约后发放奖励</p></div>
        <button onClick={() => { setFormError(""); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> 新增转介绍</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
          : data.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><Share2 className="w-12 h-12 mb-3 text-gray-300" /><p className="text-sm">暂无转介绍</p></div>
            : <table className="w-full"><thead><tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">推荐人</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">被推荐人</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">电话</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">奖励</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr></thead><tbody className="divide-y divide-gray-100">
              {data.map((r) => <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.referrer.name}</td>
                <td className="px-4 py-3 text-gray-600">{r.refereeName}{r.newStudent ? ` → ${r.newStudent.name}` : ""}</td>
                <td className="px-4 py-3 text-gray-600">{r.refereePhone || "-"}</td>
                <td className="px-4 py-3 text-gray-600">{r.rewardType ? `${r.rewardType}${r.rewardAmount ? ` ${r.rewardAmount}` : ""}` : "-"}</td>
                <td className="px-4 py-3"><span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_LABELS[r.status]?.color || "bg-gray-100"}`}>{STATUS_LABELS[r.status]?.label || r.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openUpdate(r)} className="px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded hover:bg-blue-100">更新</button>
                    <button onClick={() => handleDelete(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>)}
            </tbody></table>}
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between"><h2 className="text-lg font-semibold">新增转介绍</h2><button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">推荐人 <span className="text-red-500">*</span></label>
                <select required value={form.referrerId} onChange={(e) => setForm({ ...form, referrerId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">请选择</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">被推荐人姓名 <span className="text-red-500">*</span></label><input required value={form.refereeName} onChange={(e) => setForm({ ...form, refereeName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">被推荐人电话</label><input value={form.refereePhone} onChange={(e) => setForm({ ...form, refereePhone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">奖励类型</label><input value={form.rewardType} onChange={(e) => setForm({ ...form, rewardType: e.target.value })} placeholder="现金/优惠券/升级" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">奖励金额</label><input value={form.rewardAmount} onChange={(e) => setForm({ ...form, rewardAmount: e.target.value })} type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button><button type="submit" className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">提交</button></div>
            </form>
          </div>
        </div>
      )}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-semibold">更新转介绍状态</h2></div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-700">{editItem.referrer.name} 推荐 {editItem.refereeName}</p>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              <div className="flex justify-end gap-3 pt-2"><button onClick={() => setEditItem(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button><button onClick={handleUpdate} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">保存</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
