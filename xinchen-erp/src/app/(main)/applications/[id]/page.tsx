"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit, FileText, Award, Plane } from "lucide-react";

interface ApplicationDetail {
  id: number;
  institutionName: string;
  majorName: string;
  degree: string;
  intakeYear: number;
  intakeMonth: number;
  status: string;
  submittedAt: string | null;
  resultAt: string | null;
  remark: string | null;
  createdAt: string;
  student: { id: number; name: string; phone: string; wechat: string | null };
  order: { id: number; orderNo: string; productName: string; amount: number };
  offers: { id: number; institutionName: string; majorName: string; offerType: string; status: string; offerDate: string; deadline: string | null }[];
  visas: { id: number; visaType: string; status: string; submittedAt: string | null; resultAt: string | null; visaNumber: string | null; expiryDate: string | null }[];
  materials: { id: number; name: string; type: string; status: string; dueDate: string | null }[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PREPARING: { label: "准备中", color: "bg-gray-100 text-gray-800" },
  SUBMITTED: { label: "已提交", color: "bg-blue-100 text-blue-800" },
  REVIEWING: { label: "审核中", color: "bg-yellow-100 text-yellow-800" },
  OFFER: { label: "已获Offer", color: "bg-green-100 text-green-800" },
  REJECTED: { label: "已拒", color: "bg-red-100 text-red-800" },
  DEFERRED: { label: "延期", color: "bg-purple-100 text-purple-800" },
  ACCEPTED: { label: "已接受", color: "bg-emerald-100 text-emerald-800" },
};

const OFFER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: "已收到", color: "bg-blue-100 text-blue-800" },
  ACCEPTED: { label: "已接受", color: "bg-green-100 text-green-800" },
  DECLINED: { label: "已拒绝", color: "bg-red-100 text-red-800" },
  EXPIRED: { label: "已过期", color: "bg-gray-100 text-gray-600" },
};

const VISA_STATUS_MAP: Record<string, { label: string; color: string }> = {
  NOT_STARTED: { label: "未开始", color: "bg-gray-100 text-gray-800" },
  PREPARING: { label: "准备中", color: "bg-yellow-100 text-yellow-800" },
  SUBMITTED: { label: "已递交", color: "bg-blue-100 text-blue-800" },
  APPROVED: { label: "已获批", color: "bg-green-100 text-green-800" },
  REJECTED: { label: "已拒签", color: "bg-red-100 text-red-800" },
};

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState({ institutionName: "", majorName: "", degree: "", intakeYear: 0, intakeMonth: 0, status: "", remark: "", submittedAt: "", resultAt: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/${id}`);
      const d = await res.json();
      if (res.ok) { setData(d); setForm({ institutionName: d.institutionName, majorName: d.majorName, degree: d.degree, intakeYear: d.intakeYear, intakeMonth: d.intakeMonth, status: d.status, remark: d.remark || "", submittedAt: d.submittedAt ? d.submittedAt.slice(0, 10) : "", resultAt: d.resultAt ? d.resultAt.slice(0, 10) : "" }); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleUpdate = async () => {
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await res.json();
      if (res.ok) { setShowEditModal(false); fetchDetail(); } else { setError(d.error || "更新失败"); }
    } catch (e) { setError("网络错误"); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-6 text-gray-400">加载中...</div>;
  if (!data) return <div className="p-6 text-gray-400">申请不存在</div>;

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-500" /></button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <span onClick={() => router.push("/students")} className="hover:text-blue-600 cursor-pointer">学生档案</span>
            <span>/</span>
            <span onClick={() => router.push("/applications")} className="hover:text-blue-600 cursor-pointer">申请管理</span>
            <span>/</span>
            <span className="text-gray-600">申请详情</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{data.institutionName} - {data.majorName}</h1>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_MAP[data.status]?.color || "bg-gray-100 text-gray-800"}`}>{STATUS_MAP[data.status]?.label || data.status}</span>
          </div>
        </div>
        <button onClick={() => setShowEditModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"><Edit className="w-4 h-4" />编辑</button>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">学生</p>
          <p className="text-sm font-semibold text-gray-900">{data.student.name}</p>
          <p className="text-xs text-gray-400 mt-1">{data.student.phone}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">订单</p>
          <p className="text-sm font-semibold text-blue-600 cursor-pointer hover:underline" onClick={() => router.push(`/orders/${data.order.id}`)}>{data.order.orderNo}</p>
          <p className="text-xs text-gray-400 mt-1">{data.order.productName}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">学位 / 入学季</p>
          <p className="text-sm font-semibold text-gray-900">{data.degree}</p>
          <p className="text-xs text-gray-400 mt-1">{data.intakeYear}.{String(data.intakeMonth).padStart(2, "0")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 mb-1">订单金额</p>
          <p className="text-sm font-semibold text-gray-900">¥{Number(data.order.amount)?.toLocaleString()}</p>
        </div>
      </div>

      {/* Offer Section */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Award className="w-4 h-4 text-green-500" />Offer记录 ({data.offers.length})</h2>
          <button onClick={() => router.push(`/offers?applicationId=${id}`)} className="text-xs text-blue-600 hover:underline">查看全部</button>
        </div>
        {data.offers.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">暂无Offer记录</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full">
            <thead><tr className="border-b border-gray-100"><th className="px-6 py-2 text-left text-xs font-medium text-gray-500">院校</th><th className="px-6 py-2 text-left text-xs font-medium text-gray-500">专业</th><th className="px-6 py-2 text-left text-xs font-medium text-gray-500">类型</th><th className="px-6 py-2 text-left text-xs font-medium text-gray-500">日期</th><th className="px-6 py-2 text-left text-xs font-medium text-gray-500">状态</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {data.offers.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/offers/${o.id}`)}>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{o.institutionName}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{o.majorName}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{o.offerType === "CONDITIONAL" ? "有条件" : o.offerType === "UNCONDITIONAL" ? "无条件" : o.offerType}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{new Date(o.offerDate).toLocaleDateString("zh-CN")}</td>
                  <td className="px-6 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${OFFER_STATUS_MAP[o.status]?.color || "bg-gray-100"}`}>{OFFER_STATUS_MAP[o.status]?.label || o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {/* Visa Section */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Plane className="w-4 h-4 text-blue-500" />签证记录 ({data.visas.length})</h2>
          <button onClick={() => router.push(`/visas?applicationId=${id}`)} className="text-xs text-blue-600 hover:underline">查看全部</button>
        </div>
        {data.visas.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">暂无签证记录</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full">
            <thead><tr className="border-b border-gray-100"><th className="px-6 py-2 text-left text-xs font-medium text-gray-500">签证类型</th><th className="px-6 py-2 text-left text-xs font-medium text-gray-500">签证号</th><th className="px-6 py-2 text-left text-xs font-medium text-gray-500">递交日期</th><th className="px-6 py-2 text-left text-xs font-medium text-gray-500">结果日期</th><th className="px-6 py-2 text-left text-xs font-medium text-gray-500">状态</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {data.visas.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/visas/${v.id}`)}>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{v.visaType}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{v.visaNumber || "-"}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{v.submittedAt ? new Date(v.submittedAt).toLocaleDateString("zh-CN") : "-"}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{v.resultAt ? new Date(v.resultAt).toLocaleDateString("zh-CN") : "-"}</td>
                  <td className="px-6 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${VISA_STATUS_MAP[v.status]?.color || "bg-gray-100"}`}>{VISA_STATUS_MAP[v.status]?.label || v.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {/* Materials Section */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-orange-500" />申请材料 ({data.materials.length})</h2>
        </div>
        {data.materials.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">暂无材料记录</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full">
            <thead><tr className="border-b border-gray-100"><th className="px-6 py-2 text-left text-xs font-medium text-gray-500">材料名称</th><th className="px-6 py-2 text-left text-xs font-medium text-gray-500">类型</th><th className="px-6 py-2 text-left text-xs font-medium text-gray-500">截止日期</th><th className="px-6 py-2 text-left text-xs font-medium text-gray-500">状态</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {data.materials.map(m => (
                <tr key={m.id}>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{m.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{m.type}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{m.dueDate ? new Date(m.dueDate).toLocaleDateString("zh-CN") : "-"}</td>
                  <td className="px-6 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${m.status === "verified" ? "bg-green-100 text-green-800" : m.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"}`}>{m.status === "verified" ? "已审核" : m.status === "pending" ? "待审核" : m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">编辑申请</h2>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">院校</label><input type="text" value={form.institutionName} onChange={e => setForm(f => ({ ...f, institutionName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">专业</label><input type="text" value={form.majorName} onChange={e => setForm(f => ({ ...f, majorName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">学位</label><select value={form.degree} onChange={e => setForm(f => ({ ...f, degree: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">{[ "本科", "硕士", "博士", "预科", "语言", "其他" ].map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">状态</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">{Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">入学年份</label><input type="number" value={form.intakeYear} onChange={e => setForm(f => ({ ...f, intakeYear: parseInt(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">入学月份</label><select value={form.intakeMonth} onChange={e => setForm(f => ({ ...f, intakeMonth: parseInt(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">提交日期</label><input type="date" value={form.submittedAt} onChange={e => setForm(f => ({ ...f, submittedAt: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">结果日期</label><input type="date" value={form.resultAt} onChange={e => setForm(f => ({ ...f, resultAt: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">备注</label><textarea value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button><button onClick={handleUpdate} disabled={submitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? "保存中..." : "保存"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}