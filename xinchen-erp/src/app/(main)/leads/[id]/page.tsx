"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Phone, MessageSquare, User, MapPin, Calendar,
  Clock, Edit, Trash2, Send, RefreshCw, GraduationCap,
} from "lucide-react";

interface LeadDetail {
  id: number;
  name: string;
  phone: string;
  wechat?: string;
  source: string;
  sourceDetail?: string;
  status: string;
  targetCountry?: string;
  targetDegree?: string;
  budget?: string;
  remark?: string;
  extData?: unknown;
  lastFollowUpAt?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo: { id: number; realName: string; username: string };
  student?: { id: number; name: string; phone: string; wechat?: string } | null;
  followUps: FollowUpItem[];
  transferLogs: TransferLogItem[];
  appeals: AppealItem[];
}

interface FollowUpItem {
  id: number;
  type: string;
  content: string;
  nextPlan?: string;
  nextFollowUpAt?: string;
  createdAt: string;
  user: { id: number; realName: string };
}

interface TransferLogItem {
  id: number;
  fromUserId: number;
  toUserId: number;
  reason?: string;
  createdAt: string;
}

interface AppealItem {
  id: number;
  appellantId: number;
  reason: string;
  evidence?: string;
  status: string;
  reviewedBy?: number;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

const DEFAULT_SOURCES: { dictKey: string; dictValue: string }[] = [
  { dictKey: "WALK_IN", dictValue: "上门咨询" },
  { dictKey: "REFERRAL", dictValue: "转介绍" },
  { dictKey: "MEDIA", dictValue: "新媒体" },
  { dictKey: "SEARCH", dictValue: "搜索引擎" },
  { dictKey: "PARTNER", dictValue: "合作方" },
  { dictKey: "EXHIBITION", dictValue: "展会" },
  { dictKey: "OTHER", dictValue: "其他" },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  NEW: { label: "新线索", color: "bg-blue-100 text-blue-800" },
  CONTACTED: { label: "已联系", color: "bg-yellow-100 text-yellow-800" },
  QUALIFIED: { label: "已筛选", color: "bg-purple-100 text-purple-800" },
  CONVERTED: { label: "已转化", color: "bg-green-100 text-green-800" },
  DEAD: { label: "已无效", color: "bg-gray-100 text-gray-800" },
};

const FOLLOW_TYPE_MAP: Record<string, string> = {
  phone: "电话",
  wechat: "微信",
  visit: "面谈",
  other: "其他",
};

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 编辑弹窗
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  // 新增跟进
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpType, setFollowUpType] = useState("phone");
  const [followUpContent, setFollowUpContent] = useState("");
  const [followUpNextPlan, setFollowUpNextPlan] = useState("");
  const [followUpNextDate, setFollowUpNextDate] = useState("");
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);

  // 线索来源（数据字典 lead_source 分组）
  const [sources, setSources] = useState<{ dictKey: string; dictValue: string }[]>(DEFAULT_SOURCES);
  const sourceMap: Record<string, string> = {};
  [...DEFAULT_SOURCES, ...sources].forEach((s) => { sourceMap[s.dictKey] = s.dictValue; });

  async function fetchLead() {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setLead(data);
    } catch {
      router.push("/leads");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLead();
    fetch("/api/dicts?groupName=lead_source")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.list || []).filter((x: { isEnabled?: boolean }) => x.isEnabled !== false);
        if (list.length > 0) setSources(list);
      })
      .catch(() => {});
  }, [id]);

  function openEdit() {
    if (!lead) return;
    setEditData({
      name: lead.name,
      phone: lead.phone,
      wechat: lead.wechat || "",
      source: lead.source,
      targetCountry: lead.targetCountry || "",
      targetDegree: lead.targetDegree || "",
      budget: lead.budget || "",
      remark: lead.remark || "",
      status: lead.status,
    });
    setEditError("");
    setShowEdit(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error || "保存失败");
        return;
      }
      setShowEdit(false);
      fetchLead();
    } catch {
      setEditError("网络错误");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("确定要删除这条线索吗？此操作不可撤销。")) return;
    try {
      await fetch(`/api/leads/${id}`, { method: "DELETE" });
      router.push("/leads");
    } catch {
      alert("删除失败");
    }
  }

  async function handleAddFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!followUpContent.trim()) return;
    setFollowUpSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${id}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: followUpType,
          content: followUpContent,
          nextPlan: followUpNextPlan || undefined,
          nextFollowUpAt: followUpNextDate || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setShowFollowUp(false);
      setFollowUpContent("");
      setFollowUpNextPlan("");
      setFollowUpNextDate("");
      fetchLead();
    } catch {
      alert("添加跟进记录失败");
    } finally {
      setFollowUpSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="p-6">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/leads")}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
          <p className="text-sm text-gray-500">线索编号: {String(lead.id).padStart(6, "0")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            <Edit className="w-4 h-4" /> 编辑
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
          >
            <Trash2 className="w-4 h-4" /> 删除
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 左侧：基本信息 */}
        <div className="col-span-2 space-y-6">
          {/* 基本信息卡片 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">学生姓名</div>
                <div className="text-sm font-medium text-gray-900">{lead.name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">手机号</div>
                <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> {lead.phone}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">微信</div>
                <div className="text-sm text-gray-900">{lead.wechat || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">线索来源</div>
                <div className="text-sm text-gray-900">{sourceMap[lead.source] || lead.source}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">意向国家</div>
                <div className="text-sm text-gray-900">{lead.targetCountry || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">意向学位</div>
                <div className="text-sm text-gray-900">{lead.targetDegree || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">预算</div>
                <div className="text-sm text-gray-900">
                  {lead.budget ? `¥${Number(lead.budget).toLocaleString()}` : "-"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">创建时间</div>
                <div className="text-sm text-gray-900">
                  {new Date(lead.createdAt).toLocaleString("zh-CN")}
                </div>
              </div>
            </div>
            {lead.remark && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-400 mb-1">备注</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{lead.remark}</div>
              </div>
            )}
          </div>

          {/* 跟进记录 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">跟进记录</h2>
              <button
                onClick={() => setShowFollowUp(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                <MessageSquare className="w-4 h-4" /> 添加跟进
              </button>
            </div>

            {lead.followUps.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                暂无跟进记录
              </div>
            ) : (
              <div className="space-y-0">
                {lead.followUps.map((fu, idx) => (
                  <div
                    key={fu.id}
                    className={`relative pl-6 pb-6 ${
                      idx < lead.followUps.length - 1
                        ? "border-l-2 border-gray-100"
                        : ""
                    }`}
                  >
                    <div className="absolute left-0 top-1.5 -translate-x-1/2">
                      <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow"></div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {fu.user.realName}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          {FOLLOW_TYPE_MAP[fu.type] || fu.type}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(fu.createdAt).toLocaleString("zh-CN")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{fu.content}</p>
                      {fu.nextPlan && (
                        <p className="text-sm text-blue-600 mt-1">
                          下一步计划: {fu.nextPlan}
                        </p>
                      )}
                      {fu.nextFollowUpAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          下次跟进: {new Date(fu.nextFollowUpAt).toLocaleDateString("zh-CN")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：状态和操作 */}
        <div className="space-y-6">
          {/* 状态卡片 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">线索状态</h2>
            <span className={`inline-flex text-sm font-medium px-3 py-1 rounded-full ${STATUS_MAP[lead.status]?.color || "bg-gray-100 text-gray-800"}`}>
              {STATUS_MAP[lead.status]?.label || lead.status}
            </span>
          </div>

          {/* 归属顾问 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">归属顾问</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{lead.assignedTo.realName}</div>
                <div className="text-xs text-gray-400">@{lead.assignedTo.username}</div>
              </div>
            </div>
          </div>

          {/* 关联学生 */}
          {lead.student && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">关联学生</h2>
              <button
                onClick={() => router.push(`/students/${lead.student!.id}`)}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition w-full text-left"
              >
                <GraduationCap className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{lead.student.name}</div>
                  <div className="text-xs text-gray-400">{lead.student.phone}</div>
                </div>
              </button>
            </div>
          )}

          {/* 移交记录 */}
          {lead.transferLogs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">移交记录</h2>
              <div className="space-y-3">
                {lead.transferLogs.map((log) => (
                  <div key={log.id} className="text-sm">
                    <div className="text-gray-500">
                      移交至 #{log.toUserId}
                      {log.reason && `（${log.reason}）`}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(log.createdAt).toLocaleString("zh-CN")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 编辑弹窗 */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">编辑线索</h2>
              <button onClick={() => setShowEdit(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              {editError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{editError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                  <input type="text" value={editData.name} onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                  <input type="text" value={editData.phone} onChange={(e) => setEditData((d) => ({ ...d, phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">来源</label>
                  <select value={editData.source} onChange={(e) => setEditData((d) => ({ ...d, source: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {sources.map((s) => <option key={s.dictKey} value={s.dictKey}>{s.dictValue}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select value={editData.status} onChange={(e) => setEditData((d) => ({ ...d, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">意向国家</label>
                  <input type="text" value={editData.targetCountry} onChange={(e) => setEditData((d) => ({ ...d, targetCountry: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">意向学位</label>
                  <input type="text" value={editData.targetDegree} onChange={(e) => setEditData((d) => ({ ...d, targetDegree: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea value={editData.remark} onChange={(e) => setEditData((d) => ({ ...d, remark: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button type="submit" disabled={saving} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">{saving ? "保存中..." : "保存"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新增跟进弹窗 */}
      {showFollowUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">添加跟进记录</h2>
              <button onClick={() => setShowFollowUp(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleAddFollowUp} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">跟进方式</label>
                <select value={followUpType} onChange={(e) => setFollowUpType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="phone">电话</option>
                  <option value="wechat">微信</option>
                  <option value="visit">面谈</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">跟进内容 <span className="text-red-500">*</span></label>
                <textarea value={followUpContent} onChange={(e) => setFollowUpContent(e.target.value)} required rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="记录本次跟进内容..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">下一步计划</label>
                <input type="text" value={followUpNextPlan} onChange={(e) => setFollowUpNextPlan(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="下一步跟进计划" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">下次跟进日期</label>
                <input type="date" value={followUpNextDate} onChange={(e) => setFollowUpNextDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowFollowUp(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button type="submit" disabled={followUpSubmitting} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">{followUpSubmitting ? "提交中..." : "添加跟进"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


