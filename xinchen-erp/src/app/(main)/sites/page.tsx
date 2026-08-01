"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, ChevronLeft, ChevronRight, RefreshCw,
  Globe, Plus, ExternalLink, Trash2, Edit3, ChevronDown, ChevronUp,
} from "lucide-react";

interface SiteItem {
  id: number;
  name: string;
  domain: string;
  status: string;
  icpCompany?: string | null;
  legalRepresentative?: string | null;
  domainExpiresAt?: string | null;
  baiduAnalyticsAccount?: string | null;
  cloudAccount?: string | null;
  cloudAccountPassword?: string | null;
  cloudLoginPhone?: string | null;
  baiduSearchResourceAccount?: string | null;
  resolvedServerId?: number | null;
  resolvedServer?: { id: number; name: string; address: string } | null;
  templateId?: number | null;
  template?: { id: number; name: string } | null;
  createdAt: string;
}

interface ServerItem { id: number; name: string; address: string }
interface TemplateItem { id: number; name: string; cloudAccount?: string | null; cloudAccountPassword?: string | null; cloudLoginPhone?: string | null; icpCompany?: string | null; legalRepresentative?: string | null }

const STATUS_MAP: Record<string, string> = {
  active: "运行中",
  inactive: "已停用",
  maintenance: "维护中",
};
const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-slate-600",
  maintenance: "bg-yellow-100 text-yellow-700",
};

// 计算距到期天数
function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) return null;
  return Math.ceil((d - Date.now()) / 86400000);
}

export default function SitesPage() {
  const [data, setData] = useState<{ list: SiteItem[]; total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [cloudAccountFilter, setCloudAccountFilter] = useState("");
  const [sortBy, setSortBy] = useState<string>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<SiteItem | null>(null);
  const [formData, setFormData] = useState({
    name: "", domain: "", icpCompany: "", legalRepresentative: "",
    domainExpiresAt: "", baiduAnalyticsAccount: "", cloudAccount: "",
    cloudAccountPassword: "", cloudLoginPhone: "",
    baiduSearchResourceAccount: "", resolvedServerId: "", templateId: "",
    status: "active",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [servers, setServers] = useState<ServerItem[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (keyword) params.set("keyword", keyword);
      if (statusFilter) params.set("status", statusFilter);
      if (cloudAccountFilter) params.set("cloudAccount", cloudAccountFilter);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      const r = await fetch(`/api/sites?${params}`);
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  }, [page, pageSize, keyword, statusFilter, cloudAccountFilter, sortBy, sortOrder]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    fetch("/api/company-templates").then(r => r.json()).then(d => setTemplates(d.list || [])).catch(() => {});
    fetch("/api/servers").then(r => r.json()).then(d => setServers(d.list || [])).catch(() => {});
  }, []);

  function openNewForm() {
    setEditingItem(null);
    setFormData({ name: "", domain: "", icpCompany: "", legalRepresentative: "", domainExpiresAt: "", baiduAnalyticsAccount: "", cloudAccount: "", cloudAccountPassword: "", cloudLoginPhone: "", baiduSearchResourceAccount: "", resolvedServerId: "", templateId: "", status: "active" });
    setFormError(""); setShowForm(true);
  }

  function openEditForm(item: SiteItem) {
    setEditingItem(item);
    setFormData({
      name: item.name,
      domain: item.domain,
      icpCompany: item.icpCompany || "",
      legalRepresentative: item.legalRepresentative || "",
      domainExpiresAt: item.domainExpiresAt ? item.domainExpiresAt.slice(0, 10) : "",
      baiduAnalyticsAccount: item.baiduAnalyticsAccount || "",
      cloudAccount: item.cloudAccount || "",
      cloudAccountPassword: item.cloudAccountPassword || "",
      cloudLoginPhone: item.cloudLoginPhone || "",
      baiduSearchResourceAccount: item.baiduSearchResourceAccount || "",
      resolvedServerId: item.resolvedServerId ? String(item.resolvedServerId) : "",
      templateId: item.templateId ? String(item.templateId) : "",
      status: item.status,
    });
    setFormError(""); setShowForm(true);
  }

  // 选择公司模板后，自动填充字段
  function applyTemplate(tid: string) {
    const t = templates.find(x => String(x.id) === tid);
    if (!t) return;
    setFormData(f => ({
      ...f,
      templateId: tid,
      icpCompany: t.icpCompany || f.icpCompany,
      legalRepresentative: t.legalRepresentative || f.legalRepresentative,
      cloudAccount: t.cloudAccount || f.cloudAccount,
      cloudAccountPassword: t.cloudAccountPassword || f.cloudAccountPassword,
      cloudLoginPhone: t.cloudLoginPhone || f.cloudLoginPhone,
    }));
  }

  async function handleSubmit() {
    setFormError(""); setSubmitting(true);
    try {
      const url = editingItem ? `/api/sites/${editingItem.id}` : "/api/sites";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      const d = await res.json();
      if (!res.ok) { setFormError(d.error || "失败"); return; }
      setShowForm(false); fetchData();
    } catch (e: any) { setFormError(e?.message || "网络错误"); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(item: SiteItem) {
    if (!confirm(`确定删除站点「${item.name}」？`)) return;
    await fetch(`/api/sites/${item.id}`, { method: "DELETE" });
    fetchData();
  }

  function toggleSort(col: string) {
    if (sortBy === col) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortOrder("asc"); }
    setPage(1);
  }

  function SortIcon({ col }: { col: string }) {
    if (sortBy !== col) return <ChevronDown className="w-3.5 h-3.5 inline-block opacity-30" />;
    return sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 inline-block" /> : <ChevronDown className="w-3.5 h-3.5 inline-block" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">站点管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理公司旗下网站，跟踪站点运行状态</p>
        </div>
        <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />新增站点
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 mb-4">
        <div className="flex items-center gap-3 p-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="搜索站点名称或域名..." value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === "Enter" && setPage(1)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="">全部状态</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="text" placeholder="云账号筛选..." value={cloudAccountFilter} onChange={e => setCloudAccountFilter(e.target.value)} onKeyDown={e => e.key === "Enter" && setPage(1)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-40" />
          <button onClick={fetchData} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">搜索</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button onClick={() => toggleSort("name")} className="hover:text-slate-900">站点名称 <SortIcon col="name" /></button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">域名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">云账号</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">解析服务器</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button onClick={() => toggleSort("domainExpiresAt")} className="hover:text-slate-900">过期时间 <SortIcon col="domainExpiresAt" /></button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">加载中...</td></tr>
            ) : !data?.list?.length ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">暂无数据</td></tr>
            ) : data.list.map(s => {
              const days = daysUntil(s.domainExpiresAt);
              const isExpiring = days !== null && days <= 30;
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-sm">
                    <a href={`https://${s.domain}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                      {s.domain} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{s.cloudAccount || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{s.resolvedServer ? `${s.resolvedServer.name} (${s.resolvedServer.address})` : "-"}</td>
                  <td className={`px-4 py-3 text-sm ${isExpiring ? "text-red-600 font-bold" : "text-slate-600"}`}>
                    {s.domainExpiresAt ? new Date(s.domainExpiresAt).toLocaleDateString("zh-CN") : "-"}
                    {days !== null && days <= 30 && <span className="text-xs ml-1">({days}天{days < 0 ? "已过期" : ""})</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[s.status] || "bg-gray-100 text-slate-600"}`}>{STATUS_MAP[s.status] || s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEditForm(s)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="编辑"><Edit3 className="w-5 h-5" /></button>
                    <button onClick={() => handleDelete(s)} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="删除"><Trash2 className="w-5 h-5" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between p-4 border-t bg-slate-50">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            共 <span className="font-bold text-slate-900">{data?.total || 0}</span> 条记录，第 {page} 页
            <select value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value)); setPage(1); }} className="px-2 py-1 border border-slate-300 rounded text-sm">
              <option value="20">20/页</option>
              <option value="50">50/页</option>
              <option value="100">100/页</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 border rounded disabled:opacity-50"><ChevronLeft className="w-5 h-5" /></button>
            <span className="px-3 text-sm">{page} / {data?.totalPages || 1}</span>
            <button onClick={() => setPage(p => Math.min(data?.totalPages || 1, p + 1))} disabled={page >= (data?.totalPages || 1)} className="p-1.5 border rounded disabled:opacity-50"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">{editingItem ? "编辑站点" : "新增站点"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{formError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">站点名称 <span className="text-red-500">*</span></label><input type="text" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">域名 <span className="text-red-500">*</span></label><input type="text" value={formData.domain} onChange={e => setFormData(f => ({ ...f, domain: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="如:www.example.com" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">使用公司模板</label>
                  <select value={formData.templateId} onChange={e => applyTemplate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-yellow-50">
                    <option value="">不选择（手动填写）</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">选择模板自动填充公司信息</p>
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">状态</label>
                  <select value={formData.status} onChange={e => setFormData(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-slate-700 mb-3">公司信息</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-slate-600 mb-1">备案公司</label><input type="text" value={formData.icpCompany} onChange={e => setFormData(f => ({ ...f, icpCompany: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="block text-xs text-slate-600 mb-1">法人代表</label><input type="text" value={formData.legalRepresentative} onChange={e => setFormData(f => ({ ...f, legalRepresentative: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-slate-700 mb-3">云账号 & 百度账号</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-slate-600 mb-1">云账号</label><input type="text" value={formData.cloudAccount} onChange={e => setFormData(f => ({ ...f, cloudAccount: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="block text-xs text-slate-600 mb-1">密码</label><input type="password" value={formData.cloudAccountPassword} onChange={e => setFormData(f => ({ ...f, cloudAccountPassword: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="block text-xs text-slate-600 mb-1">登录验证手机号</label><input type="text" value={formData.cloudLoginPhone} onChange={e => setFormData(f => ({ ...f, cloudLoginPhone: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="block text-xs text-slate-600 mb-1">百度统计账号</label><input type="text" value={formData.baiduAnalyticsAccount} onChange={e => setFormData(f => ({ ...f, baiduAnalyticsAccount: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                  <div className="col-span-2"><label className="block text-xs text-slate-600 mb-1">百度搜索资源平台账号</label><input type="text" value={formData.baiduSearchResourceAccount} onChange={e => setFormData(f => ({ ...f, baiduSearchResourceAccount: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-slate-700 mb-3">解析 & 到期</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-slate-600 mb-1">解析到服务器</label>
                    <select value={formData.resolvedServerId} onChange={e => setFormData(f => ({ ...f, resolvedServerId: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                      <option value="">不选择</option>
                      {servers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.address})</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-slate-600 mb-1">域名过期时间</label><input type="date" value={formData.domainExpiresAt} onChange={e => setFormData(f => ({ ...f, domainExpiresAt: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50">{submitting ? "保存中..." : "保存"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}