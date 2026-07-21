"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Phone, MoreHorizontal, ChevronLeft, ChevronRight,
  Filter, RefreshCw, User, MapPin, GraduationCap, Calendar, MessageSquare,
  Trash2, Edit2,
} from "lucide-react";

interface LeadItem {
  id: number;
  name: string;
  phone: string;
  wechat?: string;
  source: string;
  status: string;
  targetCountry?: string;
  targetDegree?: string;
  budget?: string;
  remark?: string;
  lastFollowUpAt?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo: { id: number; realName: string; username: string };
  student?: { id: number; name: string } | null;
  _count: { followUps: number };
}

interface DictItem {
  id: number;
  dictKey: string;
  dictValue: string;
  sort: number;
  isEnabled?: boolean;
}

interface AdvisorItem {
  id: number;
  realName: string;
  username: string;
}

interface PaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: LeadItem[];
}

// 默认来源兜底（数据字典未配置时使用）
const DEFAULT_SOURCES: DictItem[] = [
  { id: 0, dictKey: "WALK_IN", dictValue: "上门咨询", sort: 0 },
  { id: 0, dictKey: "REFERRAL", dictValue: "转介绍", sort: 1 },
  { id: 0, dictKey: "MEDIA", dictValue: "新媒体", sort: 2 },
  { id: 0, dictKey: "SEARCH", dictValue: "搜索引擎", sort: 3 },
  { id: 0, dictKey: "PARTNER", dictValue: "合作方", sort: 4 },
  { id: 0, dictKey: "EXHIBITION", dictValue: "展会", sort: 5 },
  { id: 0, dictKey: "OTHER", dictValue: "其他", sort: 6 },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  NEW: { label: "新线索", color: "bg-blue-100 text-blue-800" },
  CONTACTED: { label: "已联系", color: "bg-yellow-100 text-yellow-800" },
  QUALIFIED: { label: "已筛选", color: "bg-purple-100 text-purple-800" },
  CONVERTED: { label: "已转化", color: "bg-green-100 text-green-800" },
  DEAD: { label: "已无效", color: "bg-gray-100 text-gray-800" },
};

export default function LeadsPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // 新增/编辑弹窗
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    wechat: "",
    source: "MEDIA",
    sourceDetail: "",
    businessType: "",
    partnerId: "",
    siteId: "",
    targetCountry: "",
    targetDegree: "",
    budget: "",
    remark: "",
    assignedToId: "",
    createStudent: true,
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 数据字典来源 + 顾问列表 + 合作方/站群联动
  const [sources, setSources] = useState<DictItem[]>(DEFAULT_SOURCES);
  const [advisors, setAdvisors] = useState<AdvisorItem[]>([]);
  const [partners, setPartners] = useState<{ id: number; name: string }[]>([]);
  const [sites, setSites] = useState<{ id: number; name: string; domain: string }[]>([]);
  // 来源 key -> label 映射
  const sourceMap: Record<string, string> = {};
  [...DEFAULT_SOURCES, ...sources].forEach((s) => {
    if (s.dictKey) sourceMap[s.dictKey] = s.dictValue;
  });

  // 冲突弹窗
  const [conflictData, setConflictData] = useState<{
    message: string;
    existingLead: LeadItem;
  } | null>(null);

  // 删除确认
  const [deleteConfirm, setDeleteConfirm] = useState<LeadItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      if (statusFilter) params.set("status", statusFilter);
      if (sourceFilter) params.set("source", sourceFilter);

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("获取线索列表失败:", err);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, statusFilter, sourceFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    // 加载线索来源（数据字典 lead_source 分组，实时同步）
    fetch("/api/dicts?groupName=lead_source")
      .then((r) => r.json())
      .then((d) => {
        const list: DictItem[] = (d.list || []).filter((x: DictItem) => x.isEnabled !== false);
        if (list.length > 0) setSources(list);
      })
      .catch(() => {});
    // 加载顾问列表（自动按角色 isAssignable 过滤，管理员在角色管理中设置）
    fetch("/api/advisors")
      .then((r) => r.json())
      .then((d) => setAdvisors(d.list || []))
      .catch(() => {});
    // 加载合作方列表（来源联动用）
    fetch("/api/partners?pageSize=500")
      .then((r) => r.json())
      .then((d) => setPartners(d.list || []))
      .catch(() => {});
    // 加载站群列表（来源联动用）
    fetch("/api/sites?pageSize=500")
      .then((r) => r.json())
      .then((d) => setSites(d.list || []))
      .catch(() => {});
  }, []);

  function openNewForm() {
    setEditingLead(null);
    setFormData({
      name: "", phone: "", wechat: "", source: sources[0]?.dictKey || "MEDIA",
      sourceDetail: "", businessType: "", partnerId: "", siteId: "",
      targetCountry: "", targetDegree: "", budget: "", remark: "",
      assignedToId: "", createStudent: true,
    });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(lead: LeadItem) {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      phone: lead.phone,
      wechat: lead.wechat || "",
      source: lead.source,
      sourceDetail: "",
      targetCountry: lead.targetCountry || "",
      targetDegree: lead.targetDegree || "",
      budget: lead.budget || "",
      remark: lead.remark || "",
      assignedToId: "",
      createStudent: false,
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        assignedToId: formData.assignedToId ? parseInt(formData.assignedToId) : undefined,
        createStudent: formData.createStudent,
      };

      const url = editingLead ? `/api/leads/${editingLead.id}` : "/api/leads";
      const method = editingLead ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 409 && result.conflict) {
          setConflictData({
            message: result.message,
            existingLead: result.existingLead,
          });
          return;
        }
        setFormError(result.error || "操作失败");
        return;
      }

      setShowForm(false);
      fetchLeads();
    } catch {
      setFormError("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSearch() {
    setPage(1);
    fetchLeads();
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/leads/${deleteConfirm.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || "删除失败");
        return;
      }
      setDeleteConfirm(null);
      fetchLeads();
    } catch {
      setFormError("网络错误");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">线索管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理所有销售线索，支持录入、分配、跟进和转化
          </p>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          新增线索
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索姓名、手机号、微信号..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            {[
              { key: "", label: "全部线索" },
              { key: "CONVERTED", label: "签约客户" },
              { key: "NEW,CONTACTED,QUALIFIED", label: "意向客户" },
              { key: "DEAD", label: "无意向客户" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setPage(1); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  statusFilter === tab.key
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >{tab.label}</button>
            ))}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">全部状态</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">全部来源</option>
            {sources.map((s) => (
              <option key={s.dictKey} value={s.dictKey}>{s.dictValue}</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            加载中...
          </div>
        ) : !data || data.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <User className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无线索数据</p>
            <button
              onClick={openNewForm}
              className="mt-3 text-blue-600 text-sm hover:underline"
            >
              录入第一条线索
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学生姓名</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">联系方式</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">来源</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">意向</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">归属顾问</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">跟进</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">更新时间</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.list.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => router.push(`/leads/${lead.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-sm">{lead.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {lead.phone}
                        </div>
                        {lead.wechat && (
                          <div className="text-xs text-gray-400 mt-0.5">微信: {lead.wechat}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {sourceMap[lead.source] || lead.source}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">
                          {lead.targetCountry && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {lead.targetCountry}
                            </span>
                          )}
                          {lead.targetDegree && (
                            <span className="text-xs text-gray-400">{lead.targetDegree}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_MAP[lead.status]?.color || "bg-gray-100 text-gray-800"}`}>
                          {STATUS_MAP[lead.status]?.label || lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {lead.assignedTo.realName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {lead._count.followUps}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(lead.updatedAt).toLocaleDateString("zh-CN")}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditForm(lead)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(lead)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-sm text-gray-500">
                共 {data.total} 条，第 {data.page}/{data.totalPages} 页
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, data.totalPages - 4));
                  const p = start + i;
                  if (p > data.totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 text-sm rounded transition ${
                        p === page
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 新增/编辑弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingLead ? "编辑线索" : "新增线索"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    学生姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="请输入学生姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    手机号
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData((d) => ({ ...d, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="选填，无手机号时可留空"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">微信</label>
                  <input
                    type="text"
                    value={formData.wechat}
                    onChange={(e) => setFormData((d) => ({ ...d, wechat: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="微信号"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">咨询业务</label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData((d) => ({ ...d, businessType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">请选择</option>
                    <option value="STUDY_ABROAD">留学</option>
                    <option value="RENTAL">租房</option>
                    <option value="OVERSEAS_SERVICE">境外服务</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    线索来源 <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.source}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((d) => ({ ...d, source: v, partnerId: "", siteId: "" }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {sources.map((s) => (
                      <option key={s.dictKey} value={s.dictKey}>{s.dictValue}</option>
                    ))}
                  </select>
                </div>
                {/* 来源=合作方时显示合作方选择 */}
                {formData.source === "PARTNER" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">选择合作方</label>
                    <select
                      value={formData.partnerId}
                      onChange={(e) => setFormData((d) => ({ ...d, partnerId: e.target.value, siteId: "" }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">请选择合作方</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {/* 来源=站群相关时显示站点选择 */}
                {(formData.source === "SITE" || formData.source === "SEARCH") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">选择站点</label>
                    <select
                      value={formData.siteId}
                      onChange={(e) => setFormData((d) => ({ ...d, siteId: e.target.value, partnerId: "" }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">请选择站点</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.domain})</option>
                      ))}
                    </select>
                  </div>
                )}
                {/* 其他来源无联动时不占位 */}
                {!["PARTNER", "SITE", "SEARCH"].includes(formData.source) && <div />}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分配顾问</label>
                  <select
                    value={formData.assignedToId}
                    onChange={(e) => setFormData((d) => ({ ...d, assignedToId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">不分配（默认录入人）</option>
                    {advisors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.realName || a.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.createStudent}
                      onChange={(e) => setFormData((d) => ({ ...d, createStudent: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    自动在学生中建档并加入顾问跟进列表
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">意向国家</label>
                  <input
                    type="text"
                    value={formData.targetCountry}
                    onChange={(e) => setFormData((d) => ({ ...d, targetCountry: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="如：马来西亚"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">意向学位</label>
                  <input
                    type="text"
                    value={formData.targetDegree}
                    onChange={(e) => setFormData((d) => ({ ...d, targetDegree: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="如：硕士"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">预算</label>
                <input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData((d) => ({ ...d, budget: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="预算金额（元）"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData((d) => ({ ...d, remark: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="备注信息..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
                >
                  {submitting ? "保存中..." : editingLead ? "保存修改" : "确认新增"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-xl">
              <h2 className="text-lg font-semibold text-red-800">确认删除</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">
                确定要删除线索 <strong>{deleteConfirm.name}</strong>（{deleteConfirm.phone}）吗？
              </p>
              <p className="text-xs text-gray-400 mt-2">删除后不可恢复，相关跟进记录也将一并删除。</p>
              {formError && (
                <p className="mt-2 text-sm text-red-600">{formError}</p>
              )}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => { setDeleteConfirm(null); setFormError(""); }}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
                >
                  {deleting ? "删除中..." : "确认删除"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 撞单冲突弹窗 */}
      {conflictData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-yellow-200 bg-yellow-50 rounded-t-xl">
              <h2 className="text-lg font-semibold text-yellow-800 flex items-center gap-2">
                ⚠️ 撞单提示
              </h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700 mb-4">{conflictData.message}</p>
              {conflictData.existingLead && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="text-sm font-medium text-gray-900">{conflictData.existingLead.name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    手机：{conflictData.existingLead.phone}
                  </div>
                  <div className="text-sm text-gray-500">
                    归属：{conflictData.existingLead.assignedTo.realName}
                  </div>
                  <div className="text-sm text-gray-500">
                    状态：{STATUS_MAP[conflictData.existingLead.status]?.label}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConflictData(null)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  知道了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
