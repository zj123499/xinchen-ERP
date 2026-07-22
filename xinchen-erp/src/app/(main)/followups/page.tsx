"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Plus, Send, Pencil, Trash2, ChevronLeft, ChevronRight, Phone, User, Calendar, MessageSquare, GraduationCap, Users } from "lucide-react";

interface LeadItem {
  id: number; name: string; phone: string; wechat?: string;
  source: string; status: string; businessType?: string; createdAt: string;
  assignedTo: { id: number; realName: string };
  documentAssignedTo?: { id: number; realName: string } | null;
  student?: { id: number; name: string } | null;
  _count: { followUps: number };
}
interface FollowUpItem { id: number; content: string; type: string; createdAt: string; user: { realName: string }; }
interface AdvisorItem { id: number; realName: string; }
interface IntentionItem { id: number; country: string; institution: string; major: string; degree: string; }

const FORM = {
  interested: {
    title: "意向客户", icon: <Users className="w-5 h-5 text-blue-500" />,
    statuses: "NEW,CONTACTED,QUALIFIED" as const, color: "bg-blue-50", border: "border-blue-200",
  },
  signed: {
    title: "已签约客户", icon: <Send className="w-5 h-5 text-green-500" />,
    statuses: "CONVERTED" as const, color: "bg-green-50", border: "border-green-200",
  },
  uninterested: {
    title: "无意向客户", icon: <Trash2 className="w-5 h-5 text-gray-400" />,
    statuses: "DEAD" as const, color: "bg-gray-50", border: "border-gray-200",
  },
} as const;
type FormKey = keyof typeof FORM;

export default function FollowupsPage() {
  const [activeForm, setActiveForm] = useState<FormKey>("interested");
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const pageSize = 20;

  // Doc writers
  const [docWriters, setDocWriters] = useState<AdvisorItem[]>([]);
  const [docTarget, setDocTarget] = useState<LeadItem | null>(null);
  const [docWriterId, setDocWriterId] = useState("");

  // Follow-up creation
  const [fuTarget, setFuTarget] = useState<LeadItem | null>(null);
  const [fuType, setFuType] = useState("电话");
  const [fuContent, setFuContent] = useState("");
  const [fuSaving, setFuSaving] = useState(false);

  // Follow-up list per lead
  const [fuListTarget, setFuListTarget] = useState<LeadItem | null>(null);
  const [fuList, setFuList] = useState<FollowUpItem[]>([]);
  const [fuListLoading, setFuListLoading] = useState(false);

  // Intentions for signed form
  const [intentionTarget, setIntentionTarget] = useState<LeadItem | null>(null);
  const [intentions, setIntentions] = useState<IntentionItem[]>([]);
  const [intForm, setIntForm] = useState({ country: "", institution: "", major: "", degree: "硕士" });
  const [intSaving, setIntSaving] = useState(false);

  // Init
  useEffect(() => {
    fetch("/api/advisors?roleCode=document_application").then(r => r.json()).then(d => setDocWriters(d.list || [])).catch(() => {});
  }, []);

  // Load leads
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), pageSize: String(pageSize), status: FORM[activeForm].statuses });
      if (keyword) p.set("keyword", keyword);
      const r = await fetch(`/api/leads?${p}`);
      const d = await r.json();
      setLeads(d.list || []);
      setTotal(d.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, keyword, activeForm]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Change lead status (core flow trigger)
  async function changeStatus(lead: LeadItem, newStatus: string) {
    await fetch(`/api/leads/${lead.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    fetchLeads();
  }

  // Assign document writer → trigger application creation
  async function assignDocWriter() {
    if (!docTarget || !docWriterId) return;
    const did = parseInt(docWriterId);
    await fetch(`/api/leads/${docTarget.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentAssignedToId: did }) });

    // Auto-create applications from student intentions
    if (docTarget.student?.id) {
      const r = await fetch(`/api/students/${docTarget.student.id}/intentions`);
      const d = await r.json();
      const intents: IntentionItem[] = d.list || [];
      let created = 0;
      for (const it of intents) {
        if (!it.institution) continue;
        // Get an order for the student
        const or = await fetch(`/api/orders?studentId=${docTarget.student.id}&pageSize=1`);
        const od = await or.json();
        const orderId = od.list?.[0]?.id;
        if (!orderId) continue;
        await fetch("/api/applications", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: docTarget.student.id, orderId, institutionName: it.institution, majorName: it.major || "", degree: it.degree || "硕士", status: "PREPARING" }),
        });
        created++;
      }
      if (created > 0) alert(`已自动创建 ${created} 个申请记录并流转到交付管理`);
    }

    setDocTarget(null); setDocWriterId(""); fetchLeads();
  }

  // Create follow-up record
  async function submitFollowup() {
    if (!fuTarget || !fuContent) return;
    setFuSaving(true);
    await fetch("/api/followups", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: fuTarget.student?.id, leadId: fuTarget.id, type: fuType, content: fuContent }) });
    setFuTarget(null); setFuContent(""); setFuSaving(false); fetchLeads();
  }

  // Load follow-up list
  async function loadFollowups(lead: LeadItem) {
    setFuListTarget(lead); setFuListLoading(true);
    try {
      const r = await fetch(`/api/followups?leadId=${lead.id}&pageSize=50`);
      const d = await r.json();
      setFuList(d.list || []);
    } catch { setFuList([]); }
    finally { setFuListLoading(false); }
  }

  // Load intentions
  async function loadIntentions(lead: LeadItem) {
    setIntentionTarget(lead);
    if (!lead.student?.id) return;
    try {
      const r = await fetch(`/api/students/${lead.student.id}/intentions`);
      const d = await r.json();
      setIntentions(d.list || []);
    } catch { setIntentions([]); }
  }
  async function addIntention() {
    if (!intentionTarget?.student?.id || !intForm.country) return;
    setIntSaving(true);
    await fetch(`/api/students/${intentionTarget.student.id}/intentions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(intForm) });
    setIntForm({ country: "", institution: "", major: "", degree: "硕士" });
    setIntSaving(false);
    loadIntentions(intentionTarget);
  }
  async function deleteIntention(id: number) {
    if (!intentionTarget?.student?.id || !confirm("确定删除？")) return;
    await fetch(`/api/students/${intentionTarget.student.id}/intentions?intentId=${id}`, { method: "DELETE" });
    loadIntentions(intentionTarget);
  }

  // Format helpers
  const totalPages = Math.ceil(total / pageSize);
  const biz = (t?: string) => t === "STUDY_ABROAD" ? "留学" : t === "RENTAL" ? "租房" : t === "OVERSEAS_SERVICE" ? "境外服务" : "";
  const tLabel = (s: string) => ({ NEW: "新线索", CONTACTED: "已联系", QUALIFIED: "已筛选", CONVERTED: "已签约", DEAD: "已无效" }[s] || s);
  const dateFmt = (d: string) => new Date(d).toLocaleDateString();

  const f = FORM[activeForm];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">跟进记录</h1>
        <button onClick={() => { setKeyword(""); setPage(1); }} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Form selector tabs */}
      <div className="flex gap-0 mb-6 border-b border-gray-200">
        {(Object.keys(FORM) as FormKey[]).map(k => {
          const d = FORM[k];
          const isActive = activeForm === k;
          return (
            <button key={k} onClick={() => { setActiveForm(k); setPage(1); }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition ${isActive ? "border-current " + (k === "signed" ? "text-green-600 border-green-600" : k === "interested" ? "text-blue-600 border-blue-600" : "text-gray-600 border-gray-600") : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {d.icon}{d.title}
              {isActive && <span className={`text-xs px-2 py-0.5 rounded-full ${d.color} ${d.border}`}>{total}</span>}
            </button>
          );
        })}
      </div>

      {/* Search + Form */}
      <div className={`bg-white rounded-xl shadow-sm border ${f.border} overflow-hidden`}>
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400" />
          <input type="text" placeholder="搜索姓名/手机号..." value={keyword} onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setPage(1); } }}
            className="flex-1 text-sm outline-none" />
          {keyword && <button onClick={() => { setKeyword(""); setPage(1); }} className="text-sm text-gray-400 hover:text-gray-600">清除</button>}
        </div>

        {loading ? <div className="p-16 text-center text-gray-400">加载中...</div> :
         leads.length === 0 ? <div className="p-16 text-center text-gray-400">暂无{f.title}</div> :
         <table className="w-full">
          <thead><tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
            <th className="px-4 py-3">客户</th>
            <th className="px-4 py-3">联系方式</th>
            <th className="px-4 py-3">跟进记录</th>
            {activeForm === "signed" && (<><th className="px-4 py-3">申请信息</th><th className="px-4 py-3">文书</th></>)}
            <th className="px-4 py-3">状态</th>
            <th className="px-4 py-3 w-48">操作</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {leads.map(lead => (
              <tr key={lead.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3"><div className="font-medium text-gray-900">{lead.name}</div>
                  {lead.businessType && <div className="text-xs text-gray-500">{biz(lead.businessType)}</div>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600"><Phone className="w-3 h-3 inline text-gray-400 mr-1" />{lead.phone || "-"}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{lead._count?.followUps || 0} 条</span>
                    <button onClick={() => loadFollowups(lead)} className="text-xs text-blue-600 hover:underline">查看</button>
                    <button onClick={() => { setFuTarget(lead); setFuContent(""); setFuType("电话"); }} className="text-xs text-green-600 hover:underline">添加</button>
                  </div>
                </td>
                {activeForm === "signed" && (
                  <td className="px-4 py-3 text-sm">
                    <button onClick={() => loadIntentions(lead)} className="text-xs text-blue-600 hover:underline">
                      {lead.student ? "管理意向" : "—"}
                    </button>
                  </td>
                )}
                {activeForm === "signed" && (
                  <td className="px-4 py-3 text-sm">
                    {lead.documentAssignedTo ? (
                      <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs">{lead.documentAssignedTo.realName}</span>
                    ) : (
                      <button onClick={() => { setDocTarget(lead); setDocWriterId(""); }} className="text-xs text-blue-600 hover:underline">分配文书</button>
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{tLabel(lead.status)}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 flex-wrap">
                    {activeForm === "interested" && (<>
                      <button onClick={() => changeStatus(lead, "CONVERTED")} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition">已签约</button>
                      <button onClick={() => changeStatus(lead, "DEAD")} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition">无意向</button>
                    </>)}
                    {activeForm === "signed" && (<>
                      <button onClick={() => changeStatus(lead, "QUALIFIED")} className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 transition">有意向</button>
                      <button onClick={() => changeStatus(lead, "DEAD")} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition">无意向</button>
                    </>)}
                    {activeForm === "uninterested" && <button onClick={() => changeStatus(lead, "NEW")} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition">找回想意向</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>}
        {totalPages > 1 && <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">共 {total} 条</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm self-center">{page}/{totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>}
      </div>

      {/* ==== MODALS ==== */}

      {/* 文书分配 */}
      {docTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDocTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">分配文书 - {docTarget.name}</h3>
            <p className="text-xs text-gray-500 mb-4">分配后将自动根据申请意向创建申请并流转到交付管理</p>
            <select value={docWriterId} onChange={e => setDocWriterId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mb-4 outline-none">
              <option value="">选择文书老师</option>
              {docWriters.map(d => <option key={d.id} value={d.id}>{d.realName}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={assignDocWriter} disabled={!docWriterId} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">确定分配并流转</button>
              <button onClick={() => setDocTarget(null)} className="py-2 px-6 border rounded-lg text-sm">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 添加跟进 */}
      {fuTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setFuTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">添加跟进 - {fuTarget.name}</h3>
            <div className="space-y-3">
              <select value={fuType} onChange={e => setFuType(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none">
                <option value="电话">电话</option><option value="微信">微信</option><option value="面谈">面谈</option><option value="邮件">邮件</option><option value="其他">其他</option>
              </select>
              <textarea value={fuContent} onChange={e => setFuContent(e.target.value)} rows={4} placeholder="跟进内容..." className="w-full px-3 py-2 border rounded-lg text-sm outline-none" />
              <div className="flex gap-3">
                <button onClick={submitFollowup} disabled={!fuContent || fuSaving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{fuSaving ? "保存中..." : "保存"}</button>
                <button onClick={() => setFuTarget(null)} className="py-2 px-6 border rounded-lg text-sm">取消</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 跟进记录列表 */}
      {fuListTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setFuListTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[70vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">跟进记录 - {fuListTarget.name}</h3>
            {fuListLoading ? <p className="text-sm text-gray-400 text-center py-8">加载中...</p> :
             fuList.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">暂无记录</p> :
             <div className="space-y-3">
              {fuList.map(fu => (
                <div key={fu.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{fu.type}</span>
                    <span className="text-xs text-gray-400">{fu.user.realName} · {dateFmt(fu.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{fu.content}</p>
                </div>
              ))}
             </div>}
          </div>
        </div>
      )}

      {/* 申请意向管理（已签约表单专用） */}
      {intentionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setIntentionTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">申请意向 - {intentionTarget.name}</h3>
            <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
              <input value={intForm.country} onChange={e => setIntForm(f => ({ ...f, country: e.target.value }))} placeholder="国家" className="px-2 py-1.5 border rounded text-xs outline-none" />
              <input value={intForm.institution} onChange={e => setIntForm(f => ({ ...f, institution: e.target.value }))} placeholder="院校" className="px-2 py-1.5 border rounded text-xs outline-none" />
              <input value={intForm.major} onChange={e => setIntForm(f => ({ ...f, major: e.target.value }))} placeholder="专业" className="px-2 py-1.5 border rounded text-xs outline-none" />
              <select value={intForm.degree} onChange={e => setIntForm(f => ({ ...f, degree: e.target.value }))} className="px-2 py-1.5 border rounded text-xs outline-none">
                <option>本科</option><option>硕士</option><option>博士</option><option>预科</option><option>其他</option>
              </select>
              <button onClick={addIntention} disabled={!intForm.country || intSaving} className="col-span-2 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50">{intSaving ? "保存中..." : "添加意向"}</button>
            </div>
            <p className="text-xs text-gray-500 mb-2">已添加 {intentions.length} 个意向（分配文书时自动创建申请）</p>
            {intentions.map(it => (
              <div key={it.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-1">
                <div className="text-xs">
                  <span className="font-medium">{it.country}</span>
                  {it.institution && <span className="text-gray-500 ml-1">· {it.institution}</span>}
                  {it.major && <span className="text-gray-500 ml-1">· {it.major}</span>}
                  <span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded ml-1">{it.degree}</span>
                </div>
                <button onClick={() => deleteIntention(it.id)} className="p-0.5 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
