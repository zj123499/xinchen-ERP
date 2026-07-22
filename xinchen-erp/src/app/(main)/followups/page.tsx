"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, Phone, Plus, MessageSquare, Send,
  ChevronLeft, ChevronRight, Trash2, User, Clock, Calendar,
} from "lucide-react";

interface LeadItem {
  id: number; name: string; phone: string; wechat?: string;
  source: string; status: string; businessType?: string;
  targetCountry?: string; targetDegree?: string; createdAt: string;
  assignedTo: { id: number; realName: string };
  documentAssignedTo?: { id: number; realName: string } | null;
  student?: { id: number; name: string } | null;
}

interface AdvisorItem { id: number; realName: string; }

const STATUS_MAP: Record<string, string> = {
  NEW: "新线索", CONTACTED: "已联系", QUALIFIED: "已筛选",
  CONVERTED: "已签约", DEAD: "已无效",
};
const STATUS_COLOR: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700", CONTACTED: "bg-yellow-100 text-yellow-700",
  QUALIFIED: "bg-purple-100 text-purple-700", CONVERTED: "bg-green-100 text-green-700",
  DEAD: "bg-gray-100 text-gray-500",
};

type TabKey = "signed" | "interested" | "uninterested";

export default function FollowupsPage() {
  // Pipeline
  const [activeTab, setActiveTab] = useState<TabKey>("interested");
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const pageSize = 20;
  const [tabCounts, setTabCounts] = useState({ signed: 0, interested: 0, uninterested: 0 });

  // Document writer
  const [docWriters, setDocWriters] = useState<AdvisorItem[]>([]);
  const [docModal, setDocModal] = useState<LeadItem | null>(null);
  const [docWriterId, setDocWriterId] = useState("");

  // Follow-up record creation
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [fuForm, setFuForm] = useState({ studentId: "", type: "电话", content: "", nextFollowUpAt: "" });
  const [fuSaving, setFuSaving] = useState(false);
  const [fuMsg, setFuMsg] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<{ id: number; name: string; phone: string }[]>([]);

  const loadRecentStudents = () => {
    fetch("/api/students?pageSize=20").then(r => r.json()).then(d => setStudentResults(d.list || [])).catch(() => {});
  };
  const searchStudents = (q: string) => {
    setStudentSearch(q);
    if (q.length < 2) { loadRecentStudents(); return; }
    fetch(`/api/students?keyword=${encodeURIComponent(q)}&pageSize=20`).then(r => r.json()).then(d => setStudentResults(d.list || [])).catch(() => {});
  };

  // Init
  useEffect(() => {
    fetch("/api/advisors?roleCode=document_application").then(r => r.json()).then(d => setDocWriters(d.list || [])).catch(() => {});
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      let sp = "";
      if (activeTab === "signed") sp = "CONVERTED";
      else if (activeTab === "interested") sp = "NEW,CONTACTED,QUALIFIED";
      else if (activeTab === "uninterested") sp = "DEAD";
      const p = new URLSearchParams({ page: String(page), pageSize: String(pageSize), status: sp });
      if (keyword) p.set("keyword", keyword);
      const r = await fetch(`/api/leads?${p}`);
      const d = await r.json();
      setLeads(d.list || []);
      setTotal(d.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, keyword, activeTab]);

  const fetchTabCounts = useCallback(() => {
    const bp = new URLSearchParams({ pageSize: "1" });
    if (keyword) bp.set("keyword", keyword);
    const b = `/api/leads?${bp}&status=`;
    Promise.all([
      fetch(b + "CONVERTED").then(r => r.json()).catch(() => ({ total: 0 })),
      fetch(b + "NEW,CONTACTED,QUALIFIED").then(r => r.json()).catch(() => ({ total: 0 })),
      fetch(b + "DEAD").then(r => r.json()).catch(() => ({ total: 0 })),
    ]).then(([s, i, u]) => setTabCounts({ signed: s.total || 0, interested: i.total || 0, uninterested: u.total || 0 }));
  }, [keyword]);

  useEffect(() => { fetchLeads(); fetchTabCounts(); }, [fetchLeads, fetchTabCounts]);

  // Status change
  async function changeStatus(lead: LeadItem, ns: string) {
    await fetch(`/api/leads/${lead.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: ns }) });
    fetchLeads(); fetchTabCounts();
  }

  // Assign doc
  async function assignDocWriter() {
    if (!docModal || !docWriterId) return;
    await fetch(`/api/leads/${docModal.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentAssignedToId: parseInt(docWriterId) }) });
    setDocModal(null); setDocWriterId(""); fetchLeads();
  }

  // Delete lead
  async function deleteLead(id: number) {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/leads/${id}`, { method: "DELETE" }); fetchLeads();
  }

  // Create follow-up record
  async function submitFollowup() {
    if (!fuForm.studentId || !fuForm.content) { setFuMsg("请选择学生并填写内容"); return; }
    setFuSaving(true); setFuMsg("");
    try {
      const r = await fetch("/api/followups", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: parseInt(fuForm.studentId), type: fuForm.type, content: fuForm.content, nextFollowUpAt: fuForm.nextFollowUpAt || null }) });
      if (!r.ok) throw new Error();
      setShowFollowupForm(false);
      setFuForm({ studentId: "", type: "电话", content: "", nextFollowUpAt: "" });
      setStudentSearch("");
    } catch { setFuMsg("保存失败"); }
    finally { setFuSaving(false); }
  }

  const totalPages = Math.ceil(total / pageSize);
  const bizLabel = (t?: string) => t === "STUDY_ABROAD" ? "留学" : t === "RENTAL" ? "租房" : t === "OVERSEAS_SERVICE" ? "境外服务" : "";

  const tabs = [
    { key: "signed" as TabKey, label: "已签约客户", count: tabCounts.signed, color: "text-green-600 border-green-600", bg: "bg-green-50 text-green-700" },
    { key: "interested" as TabKey, label: "意向客户", count: tabCounts.interested, color: "text-blue-600 border-blue-600", bg: "bg-blue-50 text-blue-700" },
    { key: "uninterested" as TabKey, label: "无意向客户", count: tabCounts.uninterested, color: "text-gray-600 border-gray-600", bg: "bg-gray-50 text-gray-500" },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">跟进记录</h1>
          <p className="text-sm text-gray-500 mt-1">客户跟进管理 · 签约流转 · 文书分配</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setKeyword(""); setPage(1); }} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => { setShowFollowupForm(true); setStudentResults([]); setStudentSearch(""); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition"><Plus className="w-4 h-4" />添加跟进</button>
        </div>
      </div>

      {/* TAB 导航 */}
      <div className="flex gap-0 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${activeTab === tab.key ? tab.color : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {tab.label}<span className={`text-xs px-2 py-0.5 rounded-full ${tab.bg}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search + Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="搜索姓名/手机号..." value={keyword} onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { setPage(1); } }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          {keyword && <button onClick={() => { setKeyword(""); setPage(1); }} className="text-sm text-gray-500 hover:text-gray-700">清除</button>}
        </div>

        {loading ? (
          <div className="p-16 text-center text-gray-400">加载中...</div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <User className="w-16 h-16 mb-4 text-gray-200" />
            <p className="text-sm">暂无数据</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead><tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">客户</th>
                <th className="px-4 py-3">联系方式</th>
                {activeTab === "signed" && <th className="px-4 py-3">文书</th>}
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">顾问</th>
                <th className="px-4 py-3">时间</th>
                <th className="px-4 py-3 w-52">操作</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{lead.name}</div>
                      {lead.businessType && <div className="text-xs text-gray-500 mt-0.5">{bizLabel(lead.businessType)}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" />{lead.phone || "-"}</div>
                    </td>
                    {activeTab === "signed" && (
                      <td className="px-4 py-3 text-sm">
                        {lead.documentAssignedTo ? (
                          <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs">{lead.documentAssignedTo.realName}</span>
                        ) : (
                          <button onClick={() => { setDocModal(lead); setDocWriterId(""); }} className="text-xs text-blue-600 hover:underline">分配文书</button>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[lead.status] || "bg-gray-100 text-gray-600"}`}>{STATUS_MAP[lead.status] || lead.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{lead.assignedTo.realName}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(lead.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {activeTab === "interested" && (<>
                          <button onClick={() => changeStatus(lead, "CONVERTED")} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition">签约</button>
                          <button onClick={() => changeStatus(lead, "DEAD")} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition">无意向</button>
                        </>)}
                        {activeTab === "signed" && <button onClick={() => changeStatus(lead, "QUALIFIED")} className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 transition">退回意向</button>}
                        {activeTab === "uninterested" && <button onClick={() => changeStatus(lead, "NEW")} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition">移回意向</button>}
                        <button onClick={() => deleteLead(lead.id)} className="text-xs px-2 py-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition">删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">共 {total} 条</span>
                <div className="flex items-center gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-sm text-gray-700">{page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 文书分配弹窗 */}
      {docModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDocModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">分配文书老师</h3>
            <p className="text-sm text-gray-500 mb-4">客户：{docModal.name}</p>
            <select value={docWriterId} onChange={e => setDocWriterId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">选择文书老师</option>
              {docWriters.map(d => <option key={d.id} value={d.id}>{d.realName}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={assignDocWriter} disabled={!docWriterId} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">确定</button>
              <button onClick={() => setDocModal(null)} className="py-2 px-6 border border-gray-300 rounded-lg text-sm">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 添加跟进记录弹窗 */}
      {showFollowupForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowFollowupForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">添加跟进记录</h3>
            <div className="space-y-4">
              {/* Student selector */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">学生 <span className="text-red-500">*</span></label>
                <input type="text" placeholder="点击选择或搜索学生..." value={studentSearch}
                  onChange={e => searchStudents(e.target.value)}
                  onFocus={() => { if (studentResults.length === 0) loadRecentStudents(); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                {studentResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                    {studentResults.map(s => (
                      <button key={s.id} onClick={() => { setFuForm(f => ({ ...f, studentId: String(s.id) })); setStudentSearch(s.name); setStudentResults([]); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50">
                        <span className="font-medium">{s.name}</span><span className="text-gray-400 ml-2">{s.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">跟进方式</label>
                <select value={fuForm.type} onChange={e => setFuForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                  <option value="电话">电话</option><option value="微信">微信</option><option value="面谈">面谈</option><option value="邮件">邮件</option><option value="其他">其他</option>
                </select>
              </div>
              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">跟进内容 <span className="text-red-500">*</span></label>
                <textarea value={fuForm.content} onChange={e => setFuForm(f => ({ ...f, content: e.target.value }))} rows={4}
                  placeholder="记录沟通内容、客户反馈、下一步计划..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {/* Next follow-up */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">下次跟进时间</label>
                <input type="datetime-local" value={fuForm.nextFollowUpAt} onChange={e => setFuForm(f => ({ ...f, nextFollowUpAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
              </div>
              {fuMsg && <p className="text-sm text-red-500">{fuMsg}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={submitFollowup} disabled={fuSaving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition">{fuSaving ? "保存中..." : "保存跟进"}</button>
                <button onClick={() => setShowFollowupForm(false)} className="py-2 px-6 border border-gray-300 rounded-lg text-sm">取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
