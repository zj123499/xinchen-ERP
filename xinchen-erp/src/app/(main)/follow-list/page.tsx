"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, Phone, MoreHorizontal, ChevronLeft, ChevronRight,
  Filter, RefreshCw, User, MapPin, GraduationCap, Calendar,
  Trash2, Edit2, FileText, Send,
} from "lucide-react";

interface LeadItem {
  id: number; name: string; phone: string; wechat?: string;
  source: string; status: string; businessType?: string;
  targetCountry?: string; targetDegree?: string;
  budget?: string; remark?: string; createdAt: string; updatedAt: string;
  assignedTo: { id: number; realName: string; username: string };
  documentAssignedTo?: { id: number; realName: string } | null;
  student?: { id: number; name: string } | null;
  partner?: { id: number; name: string } | null;
  site?: { id: number; name: string; domain: string } | null;
  _count: { followUps: number };
}
interface DictItem { id: number; dictKey: string; dictValue: string; sort: number; isEnabled?: boolean; }
interface AdvisorItem { id: number; realName: string; username: string; }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  NEW: { label: "新线索", color: "bg-blue-100 text-blue-700" },
  CONTACTED: { label: "已联系", color: "bg-yellow-100 text-yellow-700" },
  QUALIFIED: { label: "已筛选", color: "bg-purple-100 text-purple-700" },
  CONVERTED: { label: "已签约", color: "bg-green-100 text-green-700" },
  DEAD: { label: "已无效", color: "bg-gray-100 text-gray-500" },
};
const DEFAULT_SOURCES: DictItem[] = [
  { id: 0, dictKey: "WALK_IN", dictValue: "上门咨询", sort: 1 },
  { id: 0, dictKey: "REFERRAL", dictValue: "转介绍", sort: 2 },
  { id: 0, dictKey: "MEDIA", dictValue: "新媒体", sort: 3 },
  { id: 0, dictKey: "SEARCH", dictValue: "搜索引擎", sort: 4 },
  { id: 0, dictKey: "PARTNER", dictValue: "合作方", sort: 5 },
  { id: 0, dictKey: "EXHIBITION", dictValue: "展会", sort: 6 },
  { id: 0, dictKey: "OTHER", dictValue: "其他", sort: 7 },
];

type TabKey = "signed" | "interested" | "uninterested";

export default function LeadsPage() {
  // ====== 分类 TAB ======
  const [activeTab, setActiveTab] = useState<TabKey>("interested");

  // ====== 数据 ======
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ====== 筛选 ======
  const [keyword, setKeyword] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sources, setSources] = useState<DictItem[]>(DEFAULT_SOURCES);
  const [advisors, setAdvisors] = useState<AdvisorItem[]>([]);
  const [docWriters, setDocWriters] = useState<AdvisorItem[]>([]);
  const [partners, setPartners] = useState<{ id: number; name: string }[]>([]);
  const [sites, setSites] = useState<{ id: number; name: string; domain: string }[]>([]);

  // ====== 新增/编辑表单 ======
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadItem | null>(null);
  const [formData, setFormData] = useState({
    name: "", phone: "", wechat: "", source: "MEDIA", sourceDetail: "",
    businessType: "", partnerId: "", siteId: "",
    targetCountry: "", targetDegree: "", budget: "", remark: "",
    assignedToId: "", createStudent: true,
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // ====== 文书分配弹窗 ======
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docTargetLead, setDocTargetLead] = useState<LeadItem | null>(null);
  const [docWriterId, setDocWriterId] = useState("");

  // ====== 加载数据 ======
  const fetchLeads = useCallback(async () => {
    setLoading(true); setError("");
    try {
      let statusParam = "";
      if (activeTab === "signed") statusParam = "CONVERTED";
      else if (activeTab === "interested") statusParam = "NEW,CONTACTED,QUALIFIED";
      else if (activeTab === "uninterested") statusParam = "DEAD";

      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (keyword) params.set("keyword", keyword);
      if (sourceFilter) params.set("source", sourceFilter);
      if (statusParam) params.set("status", statusParam);

      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error(`请求失败(${res.status})`);
      const data = await res.json();
      setLeads(data.list || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, sourceFilter, activeTab]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ====== 初始化数据 ======
  useEffect(() => {
    fetch("/api/dicts?groupName=lead_source").then(r => r.json()).then(d => {
      if (d.list?.length) setSources(d.list);
    }).catch(() => {});
    fetch("/api/advisors").then(r => r.json()).then(d => setAdvisors(d.list || [])).catch(() => {});
    fetch("/api/advisors?roleCode=document_application").then(r => r.json()).then(d => setDocWriters(d.list || [])).catch(() => {});
    fetch("/api/partners?pageSize=500").then(r => r.json()).then(d => setPartners(d.list || [])).catch(() => {});
    fetch("/api/sites?pageSize=500").then(r => r.json()).then(d => setSites(d.list || [])).catch(() => {});
  }, []);

  // ====== 状态变更 ======
  async function changeStatus(lead: LeadItem, newStatus: string) {
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      fetchLeads();
    } catch { alert("状态更新失败"); }
  }

  // ====== 文书分配 ======
  async function assignDocWriter() {
    if (!docTargetLead || !docWriterId) return;
    try {
      const res = await fetch(`/api/leads/${docTargetLead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentAssignedToId: parseInt(docWriterId) }),
      });
      if (!res.ok) throw new Error();
      setDocModalOpen(false);
      setDocTargetLead(null);
      setDocWriterId("");
      fetchLeads();
    } catch { alert("分配失败"); }
  }

  // ====== 新增/编辑 ======
  function openNewForm() {
    setEditingLead(null);
    setFormData({
      name: "", phone: "", wechat: "", source: sources[0]?.dictKey || "MEDIA",
      sourceDetail: "", businessType: "", partnerId: "", siteId: "",
      targetCountry: "", targetDegree: "", budget: "", remark: "",
      assignedToId: "", createStudent: true,
    });
    setFormError(""); setShowForm(true);
  }
  function openEditForm(lead: LeadItem) {
    setEditingLead(lead);
    setFormData({
      name: lead.name, phone: lead.phone, wechat: lead.wechat || "",
      source: lead.source, sourceDetail: "", businessType: lead.businessType || "",
      partnerId: "", siteId: "",
      targetCountry: lead.targetCountry || "", targetDegree: lead.targetDegree || "",
      budget: lead.budget || "", remark: lead.remark || "",
      assignedToId: String(lead.assignedTo.id), createStudent: false,
    });
    setFormError(""); setShowForm(true);
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      const isEdit = !!editingLead;
      const body: any = {
        name: formData.name, phone: formData.phone, wechat: formData.wechat,
        source: formData.source, sourceDetail: formData.sourceDetail,
        businessType: formData.businessType || null,
        partnerId: formData.partnerId || undefined, siteId: formData.siteId || undefined,
        targetCountry: formData.targetCountry, targetDegree: formData.targetDegree,
        budget: formData.budget, remark: formData.remark,
        assignedToId: formData.assignedToId || undefined,
      };
      const url = isEdit ? `/api/leads/${editingLead!.id}` : "/api/leads";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "保存失败"); }
      setShowForm(false); fetchLeads();
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  }

  async function deleteLead(id: number) {
    if (!confirm("确定删除该线索？")) return;
    try { await fetch(`/api/leads/${id}`, { method: "DELETE" }); fetchLeads(); }
    catch { alert("删除失败"); }
  }

  const srcLabel = (key: string) => sources.find(s => s.dictKey === key)?.dictValue || key;
  const totalPages = Math.ceil(total / pageSize);

  // ====== 表格列定义 ======
  const renderTable = () => {
    if (loading) return <div className="p-16 text-center text-gray-400">加载中...</div>;
    if (error) return <div className="p-16 text-center text-red-500">{error}<br/><button onClick={fetchLeads} className="mt-2 text-blue-600 underline">重试</button></div>;
    if (leads.length === 0) {
      return <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <User className="w-16 h-16 mb-4 text-gray-200" />
        <p className="text-sm">该分类下暂无客户</p>
      </div>;
    }

    return (
      <table className="w-full">
        <thead><tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
          {activeTab === "signed" && (
            <>
              <th className="px-4 py-3">客户</th><th className="px-4 py-3">联系方式</th>
              <th className="px-4 py-3">签约顾问</th><th className="px-4 py-3">文书老师</th>
              <th className="px-4 py-3">业务</th><th className="px-4 py-3">签约时间</th>
              <th className="px-4 py-3"></th>
            </>
          )}
          {activeTab === "interested" && (
            <>
              <th className="px-4 py-3">客户</th><th className="px-4 py-3">联系方式</th>
              <th className="px-4 py-3">来源</th><th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">顾问</th><th className="px-4 py-3">录入时间</th>
              <th className="px-4 py-3 w-40">操作</th>
            </>
          )}
          {activeTab === "uninterested" && (
            <>
              <th className="px-4 py-3">客户</th><th className="px-4 py-3">联系方式</th>
              <th className="px-4 py-3">来源</th><th className="px-4 py-3">顾问</th>
              <th className="px-4 py-3">录入时间</th><th className="px-4 py-3"></th>
            </>
          )}
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-gray-50">
              {activeTab === "signed" && (
                <>
                  <td className="px-4 py-3"><div className="font-medium text-gray-900">{lead.name}</div>
                    {lead.businessType && <span className="text-xs text-gray-500">{lead.businessType === "STUDY_ABROAD" ? "留学" : lead.businessType === "RENTAL" ? "租房" : "境外服务"}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600"><div>{lead.phone}</div>{lead.wechat && <div className="text-xs text-gray-400">{lead.wechat}</div>}</td>
                  <td className="px-4 py-3 text-sm">{lead.assignedTo.realName}</td>
                  <td className="px-4 py-3 text-sm">
                    {lead.documentAssignedTo ? (
                      <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs">{lead.documentAssignedTo.realName}</span>
                    ) : (
                      <button onClick={() => { setDocTargetLead(lead); setDocWriterId(""); setDocModalOpen(true); }}
                        className="text-xs text-blue-600 hover:underline">分配文书</button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{lead.businessType === "STUDY_ABROAD" ? "留学" : lead.businessType === "RENTAL" ? "租房" : lead.businessType === "OVERSEAS_SERVICE" ? "境外服务" : "-"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(lead.updatedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEditForm(lead)} className="text-xs text-blue-600 hover:underline mr-2">编辑</button>
                    <button onClick={() => changeStatus(lead, "QUALIFIED")} className="text-xs text-orange-600 hover:underline mr-2">退回意向</button>
                    <button onClick={() => deleteLead(lead.id)} className="text-xs text-red-500 hover:underline">删除</button>
                  </td>
                </>
              )}
              {activeTab === "interested" && (
                <>
                  <td className="px-4 py-3"><div className="font-medium text-gray-900">{lead.name}</div>
                    {lead.student && <span className="text-xs text-blue-600">已建档</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600"><div>{lead.phone}</div>{lead.wechat && <div className="text-xs text-gray-400">{lead.wechat}</div>}</td>
                  <td className="px-4 py-3 text-xs"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{srcLabel(lead.source)}</span></td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded ${STATUS_MAP[lead.status]?.color || "bg-gray-100 text-gray-600"}`}>{STATUS_MAP[lead.status]?.label || lead.status}</span></td>
                  <td className="px-4 py-3 text-sm">{lead.assignedTo.realName}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(lead.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => changeStatus(lead, "CONVERTED")} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200" title="标记为已签约">签约</button>
                      <button onClick={() => changeStatus(lead, "DEAD")} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200" title="标记为无意向">无意向</button>
                      <button onClick={() => openEditForm(lead)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">编辑</button>
                    </div>
                  </td>
                </>
              )}
              {activeTab === "uninterested" && (
                <>
                  <td className="px-4 py-3"><div className="font-medium text-gray-900">{lead.name}</div></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.phone}</td>
                  <td className="px-4 py-3 text-xs"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{srcLabel(lead.source)}</span></td>
                  <td className="px-4 py-3 text-sm">{lead.assignedTo.realName}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(lead.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => changeStatus(lead, "NEW")} className="text-xs text-blue-600 hover:underline mr-2">移回意向</button>
                    <button onClick={() => deleteLead(lead.id)} className="text-xs text-red-500 hover:underline">删除</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* ====== 页面头部 + TAB ====== */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">跟进列表</h1>
          <p className="text-sm text-gray-500 mt-1">意向客户 → 签约流转 → 文书分配</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setKeyword(""); setSourceFilter(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* ====== TAB 导航 ====== */}
      <div className="flex gap-0 mb-4 border-b border-gray-200">
        {[
          { key: "signed" as TabKey, label: "已签约客户", icon: <FileText className="w-4 h-4" /> },
          { key: "interested" as TabKey, label: "意向客户", icon: <User className="w-4 h-4" /> },
          { key: "uninterested" as TabKey, label: "无意向客户", icon: <Trash2 className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon}{tab.label}
            {tab.key === "signed" && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full ml-1">{activeTab === tab.key ? total : "-"}</span>}
            {tab.key === "interested" && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full ml-1">{activeTab === tab.key ? total : "-"}</span>}
            {tab.key === "uninterested" && <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full ml-1">{activeTab === tab.key ? total : "-"}</span>}
          </button>
        ))}
      </div>

      {/* ====== 搜索/筛选 ====== */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="搜索姓名/手机号..."
            value={keyword} onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setPage(1); fetchLeads(); } }}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
          <option value="">全部来源</option>
          {sources.filter(s => s.isEnabled !== false).map(s => <option key={s.dictKey} value={s.dictKey}>{s.dictValue}</option>)}
        </select>
        <button onClick={() => { setKeyword(""); setSourceFilter(""); setPage(1); }}
          className="text-sm text-gray-500 hover:text-gray-700">清除筛选</button>
      </div>

      {/* ====== 数据表格 ====== */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {renderTable()}
      </div>

      {/* ====== 分页 ====== */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">共 {total} 条</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm text-gray-700">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ====== 新增/编辑弹窗 ====== */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{editingLead ? "编辑线索" : "新增线索"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">姓名 <span className="text-red-500">*</span></label>
                  <input required value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                  <input value={formData.phone} onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">微信</label>
                  <input value={formData.wechat} onChange={e => setFormData(d => ({ ...d, wechat: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="微信号" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">咨询业务</label>
                  <select value={formData.businessType} onChange={e => setFormData(d => ({ ...d, businessType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">请选择</option>
                    <option value="STUDY_ABROAD">留学</option>
                    <option value="RENTAL">租房</option>
                    <option value="OVERSEAS_SERVICE">境外服务</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">来源 <span className="text-red-500">*</span></label>
                  <select required value={formData.source} onChange={e => setFormData(d => ({ ...d, source: e.target.value, partnerId: "", siteId: "" }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    {sources.filter(s => s.isEnabled !== false).map(s => <option key={s.dictKey} value={s.dictKey}>{s.dictValue}</option>)}
                  </select>
                </div>
                {formData.source === "PARTNER" && <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">合作方</label>
                  <select value={formData.partnerId} onChange={e => setFormData(d => ({ ...d, partnerId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">选择合作方</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>}
                {(formData.source === "SITE" || formData.source === "SEARCH") && <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">站点</label>
                  <select value={formData.siteId} onChange={e => setFormData(d => ({ ...d, siteId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">选择站点</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.domain})</option>)}
                  </select>
                </div>}
                {!["PARTNER", "SITE", "SEARCH"].includes(formData.source) && <div />}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分配顾问</label>
                <select value={formData.assignedToId} onChange={e => setFormData(d => ({ ...d, assignedToId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">选择顾问</option>
                  {advisors.map(a => <option key={a.id} value={a.id}>{a.realName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">意向国家</label><input value={formData.targetCountry} onChange={e => setFormData(d => ({ ...d, targetCountry: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">意向学位</label><input value={formData.targetDegree} onChange={e => setFormData(d => ({ ...d, targetDegree: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">预算</label><input value={formData.budget} onChange={e => setFormData(d => ({ ...d, budget: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea value={formData.remark} onChange={e => setFormData(d => ({ ...d, remark: e.target.value }))}
                  rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none" />
              </div>
              {formError && <p className="text-red-500 text-sm">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">{saving ? "保存中..." : "保存"}</button>
                <button type="button" onClick={() => setShowForm(false)} className="py-2 px-6 border border-gray-300 rounded-lg text-gray-600 text-sm hover:bg-gray-50">取消</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== 文书分配弹窗 ====== */}
      {docModalOpen && docTargetLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDocModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">分配文书老师</h3>
            <p className="text-sm text-gray-500 mb-4">客户：{docTargetLead.name}</p>
            <select value={docWriterId} onChange={e => setDocWriterId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 outline-none">
              <option value="">选择文书老师</option>
              {docWriters.map(d => <option key={d.id} value={d.id}>{d.realName}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={assignDocWriter} disabled={!docWriterId}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">确定</button>
              <button onClick={() => setDocModalOpen(false)} className="py-2 px-6 border border-gray-300 rounded-lg text-sm">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
