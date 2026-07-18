"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Check, X, GitBranch } from "lucide-react";

interface RecordItem {
  id: number;
  businessType: string;
  businessId: number;
  status: string;
  comment: string | null;
  currentNodeOrder: number;
  applicantId: number;
  submittedAt: string;
  flow: { name: string; businessType: string };
  node: { name: string; orderNo: number } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待审批", color: "bg-yellow-100 text-yellow-800" },
  APPROVED: { label: "已通过", color: "bg-green-100 text-green-800" },
  REJECTED: { label: "已驳回", color: "bg-red-100 text-red-800" },
  TRANSFERRED: { label: "已转审", color: "bg-blue-100 text-blue-800" },
  CANCELLED: { label: "已撤销", color: "bg-gray-100 text-gray-800" },
};
const BT_LABELS: Record<string, string> = {
  CONTRACT_DISCOUNT: "合同优惠", REFUND: "退费", REIMBURSEMENT: "报销", LEAD_TRANSFER: "线索划转",
};

export default function ApprovalRecordsPage() {
  const [scope, setScope] = useState("pending");
  const [data, setData] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitForm, setSubmitForm] = useState({ businessType: "CONTRACT_DISCOUNT", businessId: "", comment: "" });
  const [submitError, setSubmitError] = useState("");

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/approval-records?scope=${scope}`).then((r) => r.json()).then((d) => setData(d.list || [])).catch(() => {}).finally(() => setLoading(false));
  }, [scope]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get("scope");
    if (q === "pending" || q === "mine" || q === "all") setScope(q);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/approval-records", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitForm),
      });
      const result = await res.json();
      if (!res.ok) { setSubmitError(result.error || "提交失败"); return; }
      setShowSubmit(false); setSubmitForm({ businessType: "CONTRACT_DISCOUNT", businessId: "", comment: "" }); fetchData();
    } catch { setSubmitError("网络错误"); }
  }
  async function decide(id: number, action: "APPROVE" | "REJECT", comment?: string) {
    await fetch(`/api/approval-records/${id}/decide`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
    });
    fetchData();
  }

  const title = scope === "pending" ? "待我审批" : scope === "mine" ? "我发起的" : "全部审批";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">提交审批 → 逐级审批 → 自动通知</p></div>
        <button onClick={() => { setSubmitError(""); setShowSubmit(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"><GitBranch className="w-4 h-4" /> 提交审批</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
          : data.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <GitBranch className="w-12 h-12 mb-3 text-gray-300" /><p className="text-sm">暂无审批记录</p></div>
            : <table className="w-full"><thead><tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">业务</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">申请人</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">当前节点</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">提交时间</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr></thead><tbody className="divide-y divide-gray-100">
              {data.map((r) => <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><div className="font-medium text-gray-900">{r.flow.name}</div>
                  <div className="text-xs text-gray-400">#{r.businessId} · {BT_LABELS[r.businessType] || r.businessType}</div></td>
                <td className="px-4 py-3 text-gray-600">申请人 #{r.applicantId}</td>
                <td className="px-4 py-3 text-gray-600">{r.node ? `第${r.node.orderNo}节点 ${r.node.name}` : "-"}</td>
                <td className="px-4 py-3"><span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_LABELS[r.status]?.color || "bg-gray-100"}`}>{STATUS_LABELS[r.status]?.label || r.status}</span></td>
                <td className="px-4 py-3 text-gray-500 text-sm">{new Date(r.submittedAt).toLocaleString("zh-CN")}</td>
                <td className="px-4 py-3">
                  {scope === "pending" && r.status === "PENDING" && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => decide(r.id, "APPROVE")} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="通过"><Check className="w-4 h-4" /></button>
                      <button onClick={() => { const c = prompt("驳回理由"); if (c !== null) decide(r.id, "REJECT", c); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="驳回"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                </td>
              </tr>)}
            </tbody></table>}
      </div>

      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">提交审批</h2>
              <button onClick={() => setShowSubmit(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {submitError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{submitError}</div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">审批类型</label>
                <select value={submitForm.businessType} onChange={(e) => setSubmitForm({ ...submitForm, businessType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {Object.entries(BT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">业务ID <span className="text-red-500">*</span></label>
                <input required value={submitForm.businessId} onChange={(e) => setSubmitForm({ ...submitForm, businessId: e.target.value })} type="number" placeholder="关联业务记录ID" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea value={submitForm.comment} onChange={(e) => setSubmitForm({ ...submitForm, comment: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSubmit(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button type="submit" className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">提交</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
