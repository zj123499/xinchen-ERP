"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Trash2, ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { useDict } from "@/lib/useDict";

interface LeadItem {
  id: number; name: string; phone: string; wechat?: string;
  source: string; status: string; businessType?: string; createdAt: string;
  lastFollowUpAt?: string;
  assignedTo: { id: number; realName: string };
  documentAssignedTo?: { id: number; realName: string } | null;
  student?: { id: number; name: string } | null;
  _count: { followUps: number };
}
interface FollowUpItem { id: number; content: string; type: string; createdAt: string; nextFollowUpAt?: string; user: { realName: string }; }
interface AdvisorItem { id: number; realName: string; }
interface IntentionItem { id: number; country: string; institution: string; major: string; degree: string; }

export type FormKey = "pending" | "interested" | "signed" | "uninterested";

const FORM_CFG: Record<FormKey, { title: string; subtitle: string; icon: string; statuses: string }> = {
  pending:     { title: "待跟进", subtitle: "新建线索进入此表，顾问跟进确认后流转至意向/无意向", icon: "📥", statuses: "NEW" },
  interested:  { title: "意向客户", subtitle: "顾问确认有意向的客户，在此管理和跟进", icon: "💼", statuses: "CONTACTED,QUALIFIED" },
  signed:      { title: "已签约客户", subtitle: "确认签约 → 填写申请国/校/专业 → 分配文书流转至交付管理", icon: "✅", statuses: "CONVERTED" },
  uninterested: { title: "无意向客户", subtitle: "暂无意向的客户备案，可随时找回", icon: "📋", statuses: "DEAD" },
};

const STYLES: Record<FormKey, { headerBg: string; headerBorder: string; headerText: string; badgeBg: string; badgeText: string; emptyBg: string; rowHover: string }> = {
  pending:     { headerBg: "bg-gradient-to-r from-blue-500 to-blue-600", headerBorder: "border-blue-300", headerText: "text-white", badgeBg: "bg-blue-100", badgeText: "text-blue-700", emptyBg: "bg-blue-50", rowHover: "hover:bg-blue-50/50" },
  interested:  { headerBg: "bg-gradient-to-r from-indigo-500 to-indigo-600", headerBorder: "border-indigo-300", headerText: "text-white", badgeBg: "bg-indigo-100", badgeText: "text-indigo-700", emptyBg: "bg-indigo-50", rowHover: "hover:bg-indigo-50/50" },
  signed:      { headerBg: "bg-gradient-to-r from-green-500 to-emerald-600", headerBorder: "border-green-300", headerText: "text-white", badgeBg: "bg-green-100", badgeText: "text-green-700", emptyBg: "bg-green-50", rowHover: "hover:bg-green-50/50" },
  uninterested: { headerBg: "bg-gradient-to-r from-gray-400 to-gray-500", headerBorder: "border-gray-300", headerText: "text-white", badgeBg: "bg-gray-100", badgeText: "text-gray-600", emptyBg: "bg-gray-50", rowHover: "hover:bg-gray-50/50" },
};

export default function FollowupsInner({ form }: { form: FormKey }) {
  const [activeForm] = useState<FormKey>(form);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const pageSize = 20;

  const [docWriters, setDocWriters] = useState<AdvisorItem[]>([]);
  const [docTarget, setDocTarget] = useState<LeadItem | null>(null);
  const [docWriterId, setDocWriterId] = useState("");

  const [fuTarget, setFuTarget] = useState<LeadItem | null>(null);
  const [fuType, setFuType] = useState("电话");
  const [fuContent, setFuContent] = useState("");
  const [fuNextDate, setFuNextDate] = useState("");
  const [fuSaving, setFuSaving] = useState(false);
  const [fuListTarget, setFuListTarget] = useState<LeadItem | null>(null);
  const [fuList, setFuList] = useState<FollowUpItem[]>([]);
  const [fuListLoading, setFuListLoading] = useState(false);

  const [intentionTarget, setIntentionTarget] = useState<LeadItem | null>(null);
  const [intentions, setIntentions] = useState<IntentionItem[]>([]);
  const [intentionsMap, setIntentionsMap] = useState<Record<number, IntentionItem[]>>({});
  const [intentionsLoaded, setIntentionsLoaded] = useState(false);
  const [intForm, setIntForm] = useState({ country: "", institution: "", major: "", degree: "硕士" });
  const [intSaving, setIntSaving] = useState(false);

  useEffect(() => { fetch("/api/advisors?roleCode=document_application").then(r => r.json()).then(d => setDocWriters(d.list || [])).catch(() => {}); }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), pageSize: String(pageSize), status: FORM_CFG[activeForm].statuses });
      if (keyword) p.set("keyword", keyword);
      const r = await fetch(`/api/leads?${p}`);
      const d = await r.json();
      setLeads(d.list || []);
      setTotal(d.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, keyword, activeForm]);
  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // 已签约表单：加载所有意向
  useEffect(() => {
    if (activeForm !== "signed" || intentionsLoaded) return;
    const loadAll = async () => {
      const map: Record<number, IntentionItem[]> = {};
      for (const lead of leads) {
        if (!lead.student?.id) continue;
        try { const r = await fetch(`/api/students/${lead.student.id}/intentions`); const d = await r.json(); if (d.list?.length) map[lead.id] = d.list; } catch {}
      }
      setIntentionsMap(map);
      setIntentionsLoaded(true);
    };
    loadAll();
  }, [activeForm, leads, intentionsLoaded]);
  useEffect(() => { setIntentionsMap({}); setIntentionsLoaded(false); }, [activeForm]);

  async function changeStatus(lead: LeadItem, newStatus: string) {
    await fetch(`/api/leads/${lead.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    fetchLeads();
  }
  async function assignDocWriter() {
    if (!docTarget || !docWriterId) return;
    const did = parseInt(docWriterId);
    await fetch(`/api/leads/${docTarget.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentAssignedToId: did }) });
    setDocTarget(null); setDocWriterId(""); fetchLeads();
  }
  async function submitFollowup() {
    if (!fuTarget || !fuContent) return;
    setFuSaving(true);
    const body: any = { studentId: fuTarget.student?.id, leadId: fuTarget.id, type: fuType, content: fuContent, nextFollowUpAt: fuNextDate || null };
    const res = await fetch("/api/followups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok && fuNextDate) {
      // 创建提醒通知
      fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: fuTarget.assignedTo.id, title: `跟进提醒：${fuTarget.name}`, content: `下次跟进时间：${new Date(fuNextDate).toLocaleString("zh-CN")}`, type: "task", link: "/followups/interested" }) }).catch(() => {});
    }
    setFuTarget(null); setFuContent(""); setFuNextDate(""); setFuSaving(false); fetchLeads();
  }
  async function loadFollowups(lead: LeadItem) {
    setFuListTarget(lead); setFuListLoading(true);
    try { const r = await fetch(`/api/followups?leadId=${lead.id}&pageSize=50`); const d = await r.json(); setFuList(d.list || []); } catch { setFuList([]); }
    finally { setFuListLoading(false); }
  }
  async function loadIntentions(lead: LeadItem) {
    setIntentionTarget(lead);
    if (!lead.student?.id) return;
    try { const r = await fetch(`/api/students/${lead.student.id}/intentions`); const d = await r.json(); setIntentions(d.list || []); } catch { setIntentions([]); }
  }
  async function addIntention() {
    if (!intentionTarget?.student?.id || !intForm.country) return;
    setIntSaving(true);
    await fetch(`/api/students/${intentionTarget.student.id}/intentions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(intForm) });
    setIntForm({ country: "", institution: "", major: "", degree: "硕士" }); setIntSaving(false); loadIntentions(intentionTarget);
    // 刷新意向缓存
    const sid = intentionTarget.student.id;
    const r = await fetch(`/api/students/${sid}/intentions`);
    const d = await r.json();
    if (d.list?.length) setIntentionsMap(prev => ({ ...prev, [intentionTarget.id]: d.list }));
  }
  async function deleteIntention(id: number) {
    if (!intentionTarget?.student?.id || !confirm("确定删除？")) return;
    await fetch(`/api/students/${intentionTarget.student.id}/intentions?intentId=${id}`, { method: "DELETE" });
    loadIntentions(intentionTarget);
  }

  const totalPages = Math.ceil(total / pageSize);
  const biz = (t?: string) => t === "STUDY_ABROAD" ? "留学" : t === "RENTAL" ? "租房" : t === "OVERSEAS_SERVICE" ? "境外服务" : "";
  const tLabel = (s: string) => ({ NEW: "新线索", CONTACTED: "已联系", QUALIFIED: "已筛选", CONVERTED: "已签约", DEAD: "已无效" }[s] || s);
  const fg = FORM_CFG[activeForm];
  const st = STYLES[activeForm];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* 顶部色条标题 */}
      <div className={`${st.headerBg} rounded-2xl px-6 py-6 mb-6 shadow-md`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">{fg.icon}</div>
            <div className={st.headerText}>
              <h1 className="text-xl font-bold">{fg.title}</h1>
              <p className="text-sm opacity-80 mt-0.5">{fg.subtitle}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-xs ${st.badgeBg} ${st.badgeText} px-2.5 py-1 rounded-full font-medium`}>共 {total} 条记录</span>
                <span className="text-xs opacity-60">{activeForm === "pending" ? "顾问确认后流转至意向或无意向" : activeForm === "interested" ? "顾问确认有意向的客户" : activeForm === "signed" ? "签约后可填写申请信息并分配文书" : "暂无意向的客户存档"}</span>
              </div>
            </div>
          </div>
          <button onClick={() => { setKeyword(""); setPage(1); }} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <Search className="w-4 h-4 text-gray-400" />
          <input type="text" placeholder="搜索姓名/手机号..." value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { setPage(1); } }} className="flex-1 text-sm bg-transparent outline-none" />
          {keyword && <button onClick={() => { setKeyword(""); setPage(1); }} className="text-xs text-gray-400 hover:text-gray-600">清除</button>}
        </div>

        {loading ? <div className="p-16 text-center text-gray-400">加载中...</div> :
         leads.length === 0 ? (
          <div className={`${st.emptyBg} p-16 text-center rounded-b-2xl`}>
            <div className="text-4xl mb-3">{fg.icon}</div>
            <p className="text-gray-500 font-medium">暂无{fg.title}</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeForm === "pending" ? "从「线索管理」录入新线索，默认进入此表" : activeForm === "interested" ? "在待跟进中将状态变更为有意向" : activeForm === "signed" ? "在「意向客户」中将状态变更为已签约" : "在跟进管理中将客户设为无意向"}
            </p>
          </div>
        ) : (
         <table className="w-full">
          <thead><tr className={`${st.emptyBg} text-left text-xs font-semibold uppercase`}
            style={{ color: activeForm === "pending" ? "#1d4ed8" : activeForm === "interested" ? "#4338ca" : activeForm === "signed" ? "#059669" : "#6b7280" }}>
            <th className="px-5 py-3.5">客户姓名</th>
            <th className="px-5 py-3.5">联系方式</th>
            <th className="px-5 py-3.5">上次跟进时间</th>
            <th className="px-5 py-3.5">跟进记录</th>
            {activeForm === "signed" && <th className="px-5 py-3.5">申请院校/专业</th>}
            {activeForm === "signed" && <th className="px-5 py-3.5">文书老师</th>}
            <th className="px-5 py-3.5">顾问</th>
            <th className="px-5 py-3.5">状态</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {leads.map(lead => (
              <tr key={lead.id} className={`${st.rowHover} transition-colors`}>
                <td className="px-5 py-3.5"><div className="font-semibold text-gray-900">{lead.name}</div>{lead.businessType && <div className="text-xs text-gray-400 mt-0.5">{biz(lead.businessType)}</div>}</td>
                <td className="px-5 py-3.5 text-sm text-gray-600"><Phone className="w-3 h-3 inline text-gray-400 mr-1" />{lead.phone || "-"}</td>
                <td className="px-5 py-3.5 text-sm text-gray-600">
                  {lead.lastFollowUpAt
                    ? new Date(lead.lastFollowUpAt).toLocaleDateString()
                    : <span className="text-gray-400">未跟进</span>}
                </td>
                <td className="px-5 py-3.5 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs ${st.badgeBg} ${st.badgeText} px-1.5 py-0.5 rounded-full font-medium`}>{lead._count?.followUps || 0} 条</span>
                    <button onClick={() => loadFollowups(lead)} className="text-xs text-blue-600 hover:underline font-medium">查看</button>
                    <button onClick={() => { setFuTarget(lead); setFuContent(""); setFuType("电话"); setFuNextDate(""); }} className="text-xs text-green-600 hover:underline font-medium">添加</button>
                  </div>
                </td>
                {activeForm === "signed" && (
                  <td className="px-5 py-3.5">
                    {(() => {
                      const intents = intentionsMap[lead.id];
                      if (!intents || intents.length === 0) return (<button onClick={() => loadIntentions(lead)} className="text-xs px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition font-medium">+ 添加志愿</button>);
                      return (<div className="space-y-1 max-w-[220px]">{intents.map((it, idx) => (
                        <div key={it.id || idx} className="text-xs leading-tight"><span className="font-medium text-gray-800">{it.country}</span>{it.institution && <span className="text-gray-500"> · {it.institution}</span>}{it.major && <span className="text-gray-400"> · {it.major}</span>}<span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded ml-1">{it.degree}</span></div>
                      ))}<button onClick={() => loadIntentions(lead)} className="text-[10px] text-blue-500 hover:underline">编辑</button></div>);
                    })()}
                  </td>
                )}
                {activeForm === "signed" && (
                  <td className="px-5 py-3.5">{lead.documentAssignedTo ? (<span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">✓ {lead.documentAssignedTo.realName}</span>) : (<button onClick={() => { setDocTarget(lead); setDocWriterId(""); }} className="text-xs px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition font-medium">📨 分配文书</button>)}</td>
                )}
                <td className="px-5 py-3.5 text-sm text-gray-600">{lead.assignedTo.realName}</td>
                <td className="px-5 py-3.5">
                  {activeForm === "pending" && (
                    <select onChange={e => { if (e.target.value) changeStatus(lead, e.target.value); }} value=""
                      className="text-xs px-2.5 py-1.5 rounded-lg border-2 border-blue-200 bg-blue-50 text-blue-700 font-medium outline-none cursor-pointer hover:border-blue-400 transition">
                      <option value="">待跟进</option>
                      <option value="CONTACTED">有意向</option>
                      <option value="DEAD">无意向</option>
                    </select>
                  )}
                  {activeForm === "interested" && (
                    <select onChange={e => { if (e.target.value) changeStatus(lead, e.target.value); }} value=""
                      className="text-xs px-2.5 py-1.5 rounded-lg border-2 border-indigo-200 bg-indigo-50 text-indigo-700 font-medium outline-none cursor-pointer hover:border-indigo-400 transition">
                      <option value="">意向客户</option>
                      <option value="CONVERTED">已签约客户</option>
                      <option value="DEAD">无意向客户</option>
                    </select>
                  )}
                  {activeForm === "signed" && (
                    <select onChange={e => { if (e.target.value) changeStatus(lead, e.target.value); }} value=""
                      className="text-xs px-2.5 py-1.5 rounded-lg border-2 border-green-200 bg-green-50 text-green-700 font-medium outline-none cursor-pointer hover:border-green-400 transition">
                      <option value="">已签约客户</option>
                      <option value="QUALIFIED">意向客户</option>
                      <option value="DEAD">无意向客户</option>
                    </select>
                  )}
                  {activeForm === "uninterested" && (
                    <select onChange={e => { if (e.target.value) changeStatus(lead, e.target.value); }} value=""
                      className="text-xs px-2.5 py-1.5 rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-600 font-medium outline-none cursor-pointer hover:border-gray-400 transition">
                      <option value="">无意向客户</option>
                      <option value="NEW">找回想意向</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>)}
        {totalPages > 1 && <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50"><span className="text-sm text-gray-500">共 {total} 条</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded hover:bg-white disabled:opacity-30 transition"><ChevronLeft className="w-4 h-4" /></button><span className="text-sm self-center px-2">{page}/{totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded hover:bg-white disabled:opacity-30 transition"><ChevronRight className="w-4 h-4" /></button></div></div>}
      </div>

      {/* 弹窗：文书分配 */}
      {docTarget && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6"><h3 className="text-lg font-semibold mb-2">分配文书 - {docTarget.name}</h3><p className="text-xs text-gray-500 mb-4">签约时已自动创建申请记录并流转到交付管理，此处仅分配文书老师</p><select value={docWriterId} onChange={e => setDocWriterId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mb-4 outline-none"><option value="">选择文书老师</option>{docWriters.map(d => <option key={d.id} value={d.id}>{d.realName}</option>)}</select><div className="flex gap-3"><button onClick={assignDocWriter} disabled={!docWriterId} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">确定分配并流转</button><button onClick={() => setDocTarget(null)} className="py-2 px-6 border rounded-lg text-sm">取消</button></div></div></div>)}

      {/* 弹窗：添加跟进 */}
      {fuTarget && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"><h3 className="text-lg font-semibold mb-4">添加跟进 - {fuTarget.name}</h3><select value={fuType} onChange={(e) => setFuType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  {followTypes.map((t) => <option key={t.dictKey} value={t.dictKey}>{t.dictValue}</option>)}
                </select><textarea value={fuContent} onChange={e => setFuContent(e.target.value)} rows={4} placeholder="跟进内容..." className="w-full px-3 py-2 border rounded-lg text-sm outline-none mb-3" /><div><label className="block text-sm font-medium text-gray-700 mb-1">下次跟进时间</label><input type="datetime-local" value={fuNextDate} onChange={e => setFuNextDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm outline-none mb-3" /></div><div className="flex gap-3"><button onClick={submitFollowup} disabled={!fuContent || fuSaving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{fuSaving ? "保存中..." : "保存"}</button><button onClick={() => setFuTarget(null)} className="py-2 px-6 border rounded-lg text-sm">取消</button></div></div></div>)}

      {/* 弹窗：跟进记录列表 */}
      {fuListTarget && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[70vh] overflow-y-auto p-6"><h3 className="text-lg font-semibold mb-4">跟进记录 - {fuListTarget.name}</h3>{fuListLoading ? <p className="text-sm text-gray-400 text-center py-8">加载中...</p> : fuList.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">暂无记录</p> : <div className="space-y-3">{fuList.map(fu => { const daysAgo = Math.floor((Date.now() - new Date(fu.createdAt).getTime()) / 86400000); const overdue = daysAgo > 3; return (<div key={fu.id} className="p-3 bg-gray-50 rounded-lg"><div className="flex items-center justify-between mb-1"><span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{fu.type}</span><span className="text-xs text-gray-400">{fu.user.realName}</span></div><p className="text-sm text-gray-700 mb-2">{fu.content}</p><div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs text-gray-500">跟进时间：{new Date(fu.createdAt).toLocaleString("zh-CN")}</span>{overdue ? <span className="text-xs text-red-500 font-medium">⚠ {daysAgo} 天未跟进</span> : <span className="text-xs text-green-500">{daysAgo === 0 ? "今天" : `${daysAgo} 天前`}</span>}</div>{fu.nextFollowUpAt && <div className="text-xs text-blue-600">📅 下次跟进：{new Date(fu.nextFollowUpAt).toLocaleString("zh-CN")}</div>}</div></div>); })}</div>}</div></div>)}

      {/* 弹窗：申请意向管理 */}
      {intentionTarget && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto p-6"><h3 className="text-lg font-semibold mb-4">申请意向 - {intentionTarget.name}</h3><p className="text-xs text-gray-500 mb-3">每个意向在分配文书时将自动创建为申请记录</p><div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-blue-50 rounded-lg"><input value={intForm.country} onChange={e => setIntForm(f => ({ ...f, country: e.target.value }))} placeholder="国家" className="px-2 py-1.5 border rounded text-xs outline-none" /><input value={intForm.institution} onChange={e => setIntForm(f => ({ ...f, institution: e.target.value }))} placeholder="院校" className="px-2 py-1.5 border rounded text-xs outline-none" /><input value={intForm.major} onChange={e => setIntForm(f => ({ ...f, major: e.target.value }))} placeholder="专业" className="px-2 py-1.5 border rounded text-xs outline-none" /><select value={intForm.degree} onChange={e => setIntForm(f => ({ ...f, degree: e.target.value }))} className="px-2 py-1.5 border rounded text-xs outline-none"><option>本科</option><option>硕士</option><option>博士</option><option>预科</option><option>其他</option></select><button onClick={addIntention} disabled={!intForm.country || intSaving} className="col-span-2 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50">{intSaving ? "保存中..." : "添加意向"}</button></div>{intentions.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">暂无申请意向</p> : intentions.map(it => (<div key={it.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-1"><div className="text-xs"><span className="font-medium">{it.country}</span>{it.institution && <span className="text-gray-500 ml-1">· {it.institution}</span>}{it.major && <span className="text-gray-500 ml-1">· {it.major}</span>}<span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded ml-1">{it.degree}</span></div><button onClick={() => deleteIntention(it.id)} className="p-0.5 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></div>))}</div></div>)}
    </div>
  );
}
