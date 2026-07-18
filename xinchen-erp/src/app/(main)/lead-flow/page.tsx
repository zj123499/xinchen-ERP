"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowRightLeft, RefreshCw, ChevronLeft, ChevronRight,
  ArrowRight, ShieldAlert, CheckCircle, XCircle, Search,
  UserPlus, Send,
} from "lucide-react";

type Tab = "transfer" | "appeal";

interface TransferLog {
  id: number;
  leadId: number;
  fromUserId: number;
  toUserId: number;
  reason?: string;
  createdAt: string;
  lead: { id: number; name: string; phone?: string };
  fromUserName: string;
  toUserName: string;
}

interface AppealItem {
  id: number;
  leadId: number;
  appellantId: number;
  reason: string;
  evidence?: string;
  status: string;
  reviewedBy?: number;
  reviewNote?: string;
  createdAt: string;
  lead: { id: number; name: string; phone?: string; assignedToId?: number };
  appellantName: string;
  reviewerName?: string;
}

interface Paginated<T> { total: number; page: number; pageSize: number; totalPages: number; list: T[]; }
interface UserOption { id: number; realName?: string; username: string; }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待审批", color: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "已通过", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "已驳回", color: "bg-red-100 text-red-700" },
};

export default function LeadFlowPage() {
  const [tab, setTab] = useState<Tab>("transfer");
  const [transferData, setTransferData] = useState<Paginated<TransferLog> | null>(null);
  const [appealData, setAppealData] = useState<Paginated<AppealItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  // 流转表单
  const [leadId, setLeadId] = useState("");
  const [toUserId, setToUserId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  // 申诉表单
  const [appealLeadId, setAppealLeadId] = useState("");
  const [appealReason, setAppealReason] = useState("");
  const [appealEvidence, setAppealEvidence] = useState("");
  // 审批备注
  const [reviewNote, setReviewNote] = useState<Record<number, string>>({});

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lead-transfers?pageSize=20");
      if (res.ok) setTransferData(await res.json());
    } finally { setLoading(false); }
  }, []);

  const loadAppeals = useCallback(async () => {
    try {
      const res = await fetch("/api/lead-appeals?pageSize=20");
      if (res.ok) setAppealData(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch("/api/advisors").then((r) => r.ok ? r.json() : null)
      .then((j) => setUsers(j?.list || [])).catch(() => {});
    loadTransfers();
    loadAppeals();
  }, [loadTransfers, loadAppeals]);

  const submitTransfer = async () => {
    setMsg("");
    if (!leadId || !toUserId) { setMsg("请填写线索ID与接收人"); return; }
    const res = await fetch("/api/lead-transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: parseInt(leadId), toUserId: parseInt(toUserId), reason: transferReason }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(json.error || "流转失败"); return; }
    setMsg("线索已流转"); setLeadId(""); setToUserId(""); setTransferReason("");
    loadTransfers();
  };

  const submitAppeal = async () => {
    setMsg("");
    if (!appealLeadId || !appealReason) { setMsg("请填写线索ID与申诉理由"); return; }
    const res = await fetch("/api/lead-appeals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: parseInt(appealLeadId), reason: appealReason, evidence: appealEvidence }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(json.error || "申诉失败"); return; }
    setMsg("申诉已提交，等待审批"); setAppealLeadId(""); setAppealReason(""); setAppealEvidence("");
    loadAppeals();
  };

  const reviewAppeal = async (id: number, decision: "APPROVED" | "REJECTED") => {
    const res = await fetch(`/api/lead-appeals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: decision, reviewNote: reviewNote[id] || "" }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(json.error || "审批失败"); return; }
    setMsg(decision === "APPROVED" ? "申诉已通过，线索已归属申诉人" : "申诉已驳回");
    loadAppeals();
  };

  const Tabs = (
    <div className="flex gap-1 border-b border-gray-200 mb-5">
      {([["transfer", "线索流转记录"], ["appeal", "公海申诉"]] as [Tab, string][]).map(([k, label]) => (
        <button key={k} onClick={() => setTab(k)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === k ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ArrowRightLeft className="w-6 h-6 text-indigo-600" /> 线索流转中心
        </h1>
        <button onClick={() => { loadTransfers(); loadAppeals(); }}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" />刷新
        </button>
      </div>

      {msg && <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 text-sm">{msg}</div>}

      {Tabs}

      {tab === "transfer" && (
        <div className="space-y-5">
          {/* 流转操作卡片 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600" /> 执行线索流转
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input value={leadId} onChange={(e) => setLeadId(e.target.value)} placeholder="线索ID"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <select value={toUserId} onChange={(e) => setToUserId(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="">选择接收人</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.realName || u.username}</option>)}
              </select>
              <input value={transferReason} onChange={(e) => setTransferReason(e.target.value)} placeholder="流转原因（选填）"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <button onClick={submitTransfer}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
                <ArrowRight className="w-4 h-4" /> 流转
              </button>
            </div>
          </div>

          {/* 流转日志 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-800">流转日志</h2></div>
            {loading ? <div className="p-10 text-center text-gray-400 text-sm">加载中…</div> :
              !transferData || transferData.list.length === 0 ? <div className="p-10 text-center text-gray-400 text-sm">暂无流转记录</div> :
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500"><tr>
                  <th className="px-5 py-3 text-left font-medium">线索</th>
                  <th className="px-5 py-3 text-left font-medium">转出人</th>
                  <th className="px-5 py-3 text-left font-medium">转入人</th>
                  <th className="px-5 py-3 text-left font-medium">原因</th>
                  <th className="px-5 py-3 text-left font-medium">时间</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {transferData.list.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">{l.lead.name}<span className="text-gray-400 text-xs ml-2">{l.lead.phone}</span></td>
                      <td className="px-5 py-3 text-gray-600">{l.fromUserName}</td>
                      <td className="px-5 py-3 text-gray-800 font-medium">{l.toUserName}</td>
                      <td className="px-5 py-3 text-gray-500">{l.reason || "-"}</td>
                      <td className="px-5 py-3 text-gray-400">{new Date(l.createdAt).toLocaleString("zh-CN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
          </div>
        </div>
      )}

      {tab === "appeal" && (
        <div className="space-y-5">
          {/* 发起申诉 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" /> 发起公海申诉
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input value={appealLeadId} onChange={(e) => setAppealLeadId(e.target.value)} placeholder="争议线索ID"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input value={appealReason} onChange={(e) => setAppealReason(e.target.value)} placeholder="申诉理由"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input value={appealEvidence} onChange={(e) => setAppealEvidence(e.target.value)} placeholder="佐证材料（选填）"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <button onClick={submitAppeal}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm">
              <Send className="w-4 h-4" /> 提交申诉
            </button>
          </div>

          {/* 申诉列表 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-800">申诉列表</h2></div>
            {loading ? <div className="p-10 text-center text-gray-400 text-sm">加载中…</div> :
              !appealData || appealData.list.length === 0 ? <div className="p-10 text-center text-gray-400 text-sm">暂无申诉</div> :
              <div className="divide-y divide-gray-50">
                {appealData.list.map((a) => (
                  <div key={a.id} className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-gray-800">{a.lead.name}
                          <span className="text-gray-400 text-xs ml-2">{a.lead.phone}</span></div>
                        <div className="text-xs text-gray-500 mt-1">申诉人：{a.appellantName} · {new Date(a.createdAt).toLocaleString("zh-CN")}</div>
                        <div className="text-sm text-gray-600 mt-2">{a.reason}</div>
                        {a.evidence && <div className="text-xs text-gray-400 mt-1">佐证：{a.evidence}</div>}
                        {a.status !== "PENDING" && (
                          <div className="text-xs text-gray-500 mt-2">
                            审批人：{a.reviewerName || "-"} {a.reviewNote ? `· 备注：${a.reviewNote}` : ""}
                          </div>
                        )}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_MAP[a.status]?.color || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_MAP[a.status]?.label || a.status}
                      </span>
                    </div>
                    {a.status === "PENDING" && (
                      <div className="mt-3 flex items-center gap-2">
                        <input value={reviewNote[a.id] || ""} onChange={(e) => setReviewNote((p) => ({ ...p, [a.id]: e.target.value }))}
                          placeholder="审批备注" className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
                        <button onClick={() => reviewAppeal(a.id, "APPROVED")}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                          <CheckCircle className="w-4 h-4" /> 通过
                        </button>
                        <button onClick={() => reviewAppeal(a.id, "REJECTED")}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                          <XCircle className="w-4 h-4" /> 驳回
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>}
          </div>
        </div>
      )}
    </div>
  );
}
