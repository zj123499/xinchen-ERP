"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";

interface OfferDetail {
  id: number;
  institutionName: string;
  majorName: string;
  offerType: string;
  conditions: string | null;
  deadline: string | null;
  status: string;
  offerDate: string;
  responseDate: string | null;
  attachmentUrl: string | null;
  application: {
    id: number;
    institutionName: string;
    majorName: string;
    degree: string;
    intakeYear: number;
    intakeMonth: number;
    status: string;
    student: { id: number; name: string; phone: string; wechat: string | null };
    order: { id: number; orderNo: string; productName: string; amount: number };
  };
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: "已收到", color: "bg-blue-100 text-blue-800" },
  ACCEPTED: { label: "已接受", color: "bg-green-100 text-green-800" },
  DECLINED: { label: "已拒绝", color: "bg-red-100 text-red-800" },
  EXPIRED: { label: "已过期", color: "bg-gray-100 text-gray-600" },
};

export default function OfferDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ institutionName: "", majorName: "", offerType: "", conditions: "", deadline: "", status: "", offerDate: "", responseDate: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/offers/${id}`);
      const d = await res.json();
      if (res.ok) {
        setData(d);
        setForm({ institutionName: d.institutionName, majorName: d.majorName, offerType: d.offerType, conditions: d.conditions || "", deadline: d.deadline ? d.deadline.slice(0, 10) : "", status: d.status, offerDate: d.offerDate ? d.offerDate.slice(0, 10) : "", responseDate: d.responseDate ? d.responseDate.slice(0, 10) : "" });
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleUpdate = async () => {
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/offers/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await res.json();
      if (res.ok) { setShowEdit(false); fetchDetail(); } else { setError(d.error || "更新失败"); }
    } catch (e) { setError("网络错误"); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirm("确定删除该 Offer 吗？此操作不可恢复。")) return;
    try {
      const res = await fetch(`/api/offers/${id}`, { method: "DELETE" });
      if (res.ok) { router.push("/offers"); } else {
        const d = await res.json();
        alert(d.error || "删除失败");
      }
    } catch { alert("网络错误"); }
  };

  if (loading) return <div className="p-6 text-gray-400">加载中...</div>;
  if (!data) return <div className="p-6 text-gray-400">Offer不存在</div>;
  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-500" /></button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <span onClick={() => router.push("/offers")} className="hover:text-blue-600 cursor-pointer">Offer管理</span>
            <span>/</span><span className="text-gray-600">Offer详情</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{data.institutionName} - {data.majorName}</h1>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_MAP[data.status]?.color || "bg-gray-100"}`}>{STATUS_MAP[data.status]?.label || data.status}</span>
          </div>
        </div>
        <button onClick={() => setShowEdit(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"><Edit className="w-4 h-4" />编辑</button>
        <button onClick={handleDelete} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"><Trash2 className="w-4 h-4" />删除</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-400 mb-1">学生</p><p className="text-sm font-semibold text-blue-600 cursor-pointer hover:underline" onClick={() => router.push(`/students/${data.application.student.id}`)}>{data.application.student.name}</p><p className="text-xs text-gray-400 mt-1">{data.application.student.phone}</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-400 mb-1">关联订单</p><p className="text-sm font-semibold text-blue-600 cursor-pointer hover:underline" onClick={() => router.push(`/orders/${data.application.order.id}`)}>{data.application.order.orderNo}</p><p className="text-xs text-gray-400 mt-1">{data.application.order.productName}</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-400 mb-1">Offer类型</p><p className="text-sm font-semibold text-gray-900">{data.offerType === "CONDITIONAL" ? "有条件录取" : data.offerType === "UNCONDITIONAL" ? "无条件录取" : data.offerType}</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-400 mb-1">Offer日期</p><p className="text-sm font-semibold text-gray-900">{new Date(data.offerDate).toLocaleDateString("zh-CN")}</p>{data.deadline && <p className="text-xs text-red-500 mt-1">截止：{new Date(data.deadline).toLocaleDateString("zh-CN")}</p>}</div>
      </div>
      {data.conditions && (<div className="bg-white rounded-xl border border-gray-200 p-6 mb-6"><h3 className="text-sm font-semibold text-gray-900 mb-2">录取条件</h3><p className="text-sm text-gray-600 whitespace-pre-wrap">{data.conditions}</p></div>)}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6"><h3 className="text-sm font-semibold text-gray-900 mb-4">申请信息</h3><div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-gray-400">院校</span><span className="text-gray-900">{data.application.institutionName}</span></div><div className="flex justify-between text-sm"><span className="text-gray-400">专业</span><span className="text-gray-900">{data.application.majorName}</span></div><div className="flex justify-between text-sm"><span className="text-gray-400">学位</span><span className="text-gray-900">{data.application.degree}</span></div><div className="flex justify-between text-sm"><span className="text-gray-400">入学季</span><span className="text-gray-900">{data.application.intakeYear}.{String(data.application.intakeMonth).padStart(2, "0")}</span></div></div></div>
        <div className="bg-white rounded-xl border border-gray-200 p-6"><h3 className="text-sm font-semibold text-gray-900 mb-4">Offer详情</h3><div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-gray-400">响应日期</span><span className="text-gray-900">{data.responseDate ? new Date(data.responseDate).toLocaleDateString("zh-CN") : "-"}</span></div><div className="flex justify-between text-sm"><span className="text-gray-400">订单金额</span><span className="text-gray-900 font-semibold">¥{Number(data.application.order.amount)?.toLocaleString()}</span></div></div></div>
      </div>
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">编辑Offer</h2>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">院校</label><input type="text" value={form.institutionName} onChange={e => setForm(f => ({ ...f, institutionName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">专业</label><input type="text" value={form.majorName} onChange={e => setForm(f => ({ ...f, majorName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Offer类型</label><select value={form.offerType} onChange={e => setForm(f => ({ ...f, offerType: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="CONDITIONAL">有条件录取</option><option value="UNCONDITIONAL">无条件录取</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">状态</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">{Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Offer日期</label><input type="date" value={form.offerDate} onChange={e => setForm(f => ({ ...f, offerDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label><input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">响应日期</label><input type="date" value={form.responseDate} onChange={e => setForm(f => ({ ...f, responseDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">录取条件</label><textarea value={form.conditions} onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button><button onClick={handleUpdate} disabled={submitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? "保存中..." : "保存"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
