"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";

interface VisaDetail {
  id: number;
  visaType: string;
  status: string;
  submittedAt: string | null;
  resultAt: string | null;
  visaNumber: string | null;
  expiryDate: string | null;
  createdAt: string;
  application: {
    id: number;
    institutionName: string;
    majorName: string;
    degree: string;
    intakeYear: number;
    intakeMonth: number;
    status: string;
    student: { id: number; name: string; phone: string; wechat: string | null };
    order: { id: number; orderNo: string; productName: string };
  };
}

const VISA_STATUS_MAP: Record<string, { label: string; color: string }> = {
  NOT_STARTED: { label: "未开始", color: "bg-gray-100 text-gray-800" },
  PREPARING: { label: "准备中", color: "bg-yellow-100 text-yellow-800" },
  SUBMITTED: { label: "已递交", color: "bg-blue-100 text-blue-800" },
  APPROVED: { label: "已获批", color: "bg-green-100 text-green-800" },
  REJECTED: { label: "已拒签", color: "bg-red-100 text-red-800" },
};

export default function VisaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<VisaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ visaType: "", status: "", submittedAt: "", resultAt: "", visaNumber: "", expiryDate: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/visas/${id}`);
      const d = await res.json();
      if (res.ok) {
        setData(d);
        setForm({ visaType: d.visaType, status: d.status, submittedAt: d.submittedAt ? d.submittedAt.slice(0, 10) : "", resultAt: d.resultAt ? d.resultAt.slice(0, 10) : "", visaNumber: d.visaNumber || "", expiryDate: d.expiryDate ? d.expiryDate.slice(0, 10) : "" });
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleUpdate = async () => {
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/visas/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await res.json();
      if (res.ok) { setShowEdit(false); fetchDetail(); } else { setError(d.error || "更新失败"); }
    } catch (e) { setError("网络错误"); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirm("确定删除该签证记录吗？此操作不可恢复。")) return;
    try {
      const res = await fetch(`/api/visas/${id}`, { method: "DELETE" });
      if (res.ok) { router.push("/visas"); } else {
        const d = await res.json();
        alert(d.error || "删除失败");
      }
    } catch { alert("网络错误"); }
  };

  if (loading) return <div className="p-6 text-gray-400">加载中...</div>;
  if (!data) return <div className="p-6 text-gray-400">签证不存在</div>;
  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-500" /></button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <span onClick={() => router.push("/visas")} className="hover:text-blue-600 cursor-pointer">签证管理</span>
            <span>/</span><span className="text-gray-600">签证详情</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{data.visaType}</h1>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${VISA_STATUS_MAP[data.status]?.color || "bg-gray-100"}`}>{VISA_STATUS_MAP[data.status]?.label || data.status}</span>
          </div>
        </div>
        <button onClick={() => setShowEdit(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"><Edit className="w-4 h-4" />编辑</button>
        <button onClick={handleDelete} className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"><Trash2 className="w-4 h-4" />删除</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-400 mb-1">学生</p><p className="text-sm font-semibold text-blue-600 cursor-pointer hover:underline" onClick={() => router.push(`/students/${data.application.student.id}`)}>{data.application.student.name}</p><p className="text-xs text-gray-400 mt-1">{data.application.student.phone}</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-400 mb-1">关联订单</p><p className="text-sm font-semibold text-blue-600 cursor-pointer hover:underline" onClick={() => router.push(`/orders/${data.application.order.id}`)}>{data.application.order.orderNo}</p><p className="text-xs text-gray-400 mt-1">{data.application.order.productName}</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-400 mb-1">签证号</p><p className="text-sm font-semibold text-gray-900">{data.visaNumber || "-"}</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-400 mb-1">有效期至</p><p className="text-sm font-semibold text-gray-900">{data.expiryDate ? new Date(data.expiryDate).toLocaleDateString("zh-CN") : "-"}</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6"><h3 className="text-sm font-semibold text-gray-900 mb-4">申请信息</h3><div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-gray-400">院校</span><span className="text-gray-900">{data.application.institutionName}</span></div><div className="flex justify-between text-sm"><span className="text-gray-400">专业</span><span className="text-gray-900">{data.application.majorName}</span></div><div className="flex justify-between text-sm"><span className="text-gray-400">学位</span><span className="text-gray-900">{data.application.degree}</span></div><div className="flex justify-between text-sm"><span className="text-gray-400">入学季</span><span className="text-gray-900">{data.application.intakeYear}.{String(data.application.intakeMonth).padStart(2, "0")}</span></div></div></div>
        <div className="bg-white rounded-xl border border-gray-200 p-6"><h3 className="text-sm font-semibold text-gray-900 mb-4">签证进度</h3><div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-gray-400">递交日期</span><span className="text-gray-900">{data.submittedAt ? new Date(data.submittedAt).toLocaleDateString("zh-CN") : "-"}</span></div><div className="flex justify-between text-sm"><span className="text-gray-400">结果日期</span><span className="text-gray-900">{data.resultAt ? new Date(data.resultAt).toLocaleDateString("zh-CN") : "-"}</span></div><div className="flex justify-between text-sm"><span className="text-gray-400">创建日期</span><span className="text-gray-900">{new Date(data.createdAt).toLocaleDateString("zh-CN")}</span></div></div></div>
      </div>
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">编辑签证</h2>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">签证类型</label><input type="text" value={form.visaType} onChange={e => setForm(f => ({ ...f, visaType: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">状态</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">{Object.entries(VISA_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">递交日期</label><input type="date" value={form.submittedAt} onChange={e => setForm(f => ({ ...f, submittedAt: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">结果日期</label><input type="date" value={form.resultAt} onChange={e => setForm(f => ({ ...f, resultAt: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">签证号</label><input type="text" value={form.visaNumber} onChange={e => setForm(f => ({ ...f, visaNumber: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">有效期至</label><input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button><button onClick={handleUpdate} disabled={submitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? "保存中..." : "保存"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
