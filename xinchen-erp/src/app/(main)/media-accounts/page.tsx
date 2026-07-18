"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, ChevronLeft, ChevronRight, RefreshCw,
  Filter, Plus, TrendingUp, Users, Eye, MousePointerClick,
  Target, BarChart3, Smartphone,
  Trash2, Edit3, X,
} from "lucide-react";

interface MediaAccountItem {
  id: number;
  platform: string;
  accountName: string;
  accountId: string | null;
  followers: number;
  status: boolean;
  createdAt: string;
  performances?: MediaPerformanceItem[];
}

interface MediaPerformanceItem {
  id: number;
  accountId: number;
  statDate: string;
  impressions: number;
  clicks: number;
  leads: number;
  followersDelta: number;
  createdAt: string;
  account?: { id: number; accountName: string; platform: string };
}

interface PaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: MediaAccountItem[];
}

interface PerfPaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: MediaPerformanceItem[];
}

const PLATFORM_MAP: Record<string, string> = {
  xiaohongshu: "小红书",
  douyin: "抖音",
  wechat: "微信公众号",
  weibo: "微博",
  bilibili: "B站",
  zhihu: "知乎",
  kuaishou: "快手",
  other: "其他",
};

const PLATFORM_COLOR: Record<string, string> = {
  xiaohongshu: "bg-red-100 text-red-700",
  douyin: "bg-gray-900 text-white",
  wechat: "bg-green-100 text-green-700",
  weibo: "bg-orange-100 text-orange-700",
  bilibili: "bg-pink-100 text-pink-700",
  zhihu: "bg-blue-100 text-blue-700",
  kuaishou: "bg-yellow-100 text-yellow-700",
  other: "bg-gray-100 text-gray-600",
};

const PLATFORMS = Object.keys(PLATFORM_MAP);

function formatNumber(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

export default function MediaAccountsPage() {
  const [tab, setTab] = useState<"accounts" | "performances">("accounts");

  // Account state
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [platformFilter, setPlatformFilter] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const pageSize = 20;

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaAccountItem | null>(null);
  const [formData, setFormData] = useState({ platform: "", accountName: "", accountId: "", followers: "0" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<MediaAccountItem | null>(null);

  // Performance state
  const [perfData, setPerfData] = useState<PerfPaginatedResponse | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfPage, setPerfPage] = useState(1);
  const [perfAccountFilter, setPerfAccountFilter] = useState("");
  const [accounts, setAccounts] = useState<MediaAccountItem[]>([]);

  const [showPerfForm, setShowPerfForm] = useState(false);
  const [editingPerf, setEditingPerf] = useState<MediaPerformanceItem | null>(null);
  const [perfFormData, setPerfFormData] = useState({
    accountId: "", statDate: "", impressions: "0", clicks: "0", leads: "0", followersDelta: "0",
  });
  const [perfFormError, setPerfFormError] = useState("");
  const [perfSubmitting, setPerfSubmitting] = useState(false);
  const [perfDeleteConfirm, setPerfDeleteConfirm] = useState<MediaPerformanceItem | null>(null);

  // ===== Account CRUD =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchKeyword) params.set("keyword", searchKeyword);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (platformFilter) params.set("platform", platformFilter);
      const res = await fetch(`/api/media-accounts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch (err) {
      console.error("获取账号列表失败", err);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, page, platformFilter]);

  useEffect(() => { if (tab === "accounts") fetchData(); }, [fetchData, tab]);

  useEffect(() => {
    fetch("/api/media-accounts?pageSize=200").then(r => r.json()).then(d => {
      setAccounts(d.list || []);
    }).catch(() => {});
  }, []);

  function openNewForm() {
    setEditingItem(null);
    setFormData({ platform: "", accountName: "", accountId: "", followers: "0" });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(item: MediaAccountItem) {
    setEditingItem(item);
    setFormData({
      platform: item.platform,
      accountName: item.accountName,
      accountId: item.accountId || "",
      followers: String(item.followers),
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const payload: any = {
        platform: formData.platform,
        accountName: formData.accountName,
        accountId: formData.accountId || undefined,
        followers: formData.followers,
      };
      const url = editingItem ? `/api/media-accounts/${editingItem.id}` : "/api/media-accounts";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || "操作失败");
        return;
      }
      setShowForm(false);
      fetchData();
    } catch {
      setFormError("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      await fetch(`/api/media-accounts/${deleteConfirm.id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      fetchData();
    } catch {
      setFormError("删除失败");
    }
  }

  function handleSearch() {
    setPage(1);
    setSearchKeyword(keyword);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  // ===== Performance CRUD =====
  const fetchPerfData = useCallback(async () => {
    setPerfLoading(true);
    try {
      const params = new URLSearchParams();
      if (perfAccountFilter) params.set("accountId", perfAccountFilter);
      params.set("page", String(perfPage));
      params.set("pageSize", String(pageSize));
      const res = await fetch(`/api/media-performances?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setPerfData(await res.json());
    } catch (err) {
      console.error("获取表现数据失败", err);
    } finally {
      setPerfLoading(false);
    }
  }, [perfAccountFilter, perfPage]);

  useEffect(() => { if (tab === "performances") fetchPerfData(); }, [fetchPerfData, tab]);

  function openNewPerfForm() {
    setEditingPerf(null);
    setPerfFormData({ accountId: perfAccountFilter, statDate: "", impressions: "0", clicks: "0", leads: "0", followersDelta: "0" });
    setPerfFormError("");
    setShowPerfForm(true);
  }

  function openEditPerfForm(item: MediaPerformanceItem) {
    setEditingPerf(item);
    setPerfFormData({
      accountId: String(item.accountId),
      statDate: item.statDate ? item.statDate.slice(0, 10) : "",
      impressions: String(item.impressions),
      clicks: String(item.clicks),
      leads: String(item.leads),
      followersDelta: String(item.followersDelta),
    });
    setPerfFormError("");
    setShowPerfForm(true);
  }

  async function handlePerfSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPerfFormError("");
    setPerfSubmitting(true);
    try {
      const payload: any = {
        accountId: perfFormData.accountId,
        statDate: perfFormData.statDate,
        impressions: perfFormData.impressions,
        clicks: perfFormData.clicks,
        leads: perfFormData.leads,
        followersDelta: perfFormData.followersDelta,
      };
      const url = editingPerf ? `/api/media-performances/${editingPerf.id}` : "/api/media-performances";
      const method = editingPerf ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setPerfFormError(err.error || "操作失败");
        return;
      }
      setShowPerfForm(false);
      fetchPerfData();
    } catch {
      setPerfFormError("网络错误");
    } finally {
      setPerfSubmitting(false);
    }
  }

  async function handlePerfDelete() {
    if (!perfDeleteConfirm) return;
    try {
      await fetch(`/api/media-performances/${perfDeleteConfirm.id}`, { method: "DELETE" });
      setPerfDeleteConfirm(null);
      fetchPerfData();
    } catch {
      setPerfFormError("删除失败");
    }
  }

  // ===== Summary Stats for accounts =====
  const totalFollowers = data ? data.list.reduce((sum, a) => sum + a.followers, 0) : 0;
  const activeAccounts = data ? data.list.filter(a => a.status).length : 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新媒体账号</h1>
          <p className="text-sm text-gray-500 mt-1">管理各平台新媒体账号及运营表现数据</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "accounts" && (
            <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
              <Plus className="w-4 h-4" />新增账号
            </button>
          )}
          {tab === "performances" && (
            <button onClick={openNewPerfForm} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
              <Plus className="w-4 h-4" />新增数据
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {tab === "accounts" && data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><Smartphone className="w-5 h-5 text-blue-600" /></div>
              <div>
                <div className="text-xs text-gray-500">账号总数</div>
                <div className="text-xl font-bold text-gray-900">{data.total}</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-green-600" /></div>
              <div>
                <div className="text-xs text-gray-500">总粉丝数</div>
                <div className="text-xl font-bold text-gray-900">{formatNumber(totalFollowers)}</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-purple-600" /></div>
              <div>
                <div className="text-xs text-gray-500">活跃账号</div>
                <div className="text-xl font-bold text-gray-900">{activeAccounts}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setTab("accounts")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition ${tab === "accounts" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
          <Smartphone className="w-4 h-4 inline mr-1.5" />账号管理
        </button>
        <button onClick={() => setTab("performances")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition ${tab === "performances" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
          <BarChart3 className="w-4 h-4 inline mr-1.5" />表现数据
        </button>
      </div>

      {/* ============ Accounts Tab ============ */}
      {tab === "accounts" && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="搜索账号名称或ID..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="relative">
                <button onClick={() => setShowFilter(!showFilter)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition ${platformFilter ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
                  <Filter className="w-4 h-4" /> 平台 {platformFilter && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                </button>
                {showFilter && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-3 min-w-[180px]">
                    <div className="text-xs font-medium text-gray-500 mb-2">选择平台</div>
                    <div className="space-y-1">
                      <button onClick={() => { setPlatformFilter(""); setPage(1); setShowFilter(false); }}
                        className={`w-full text-left px-2 py-1 text-sm rounded ${!platformFilter ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>全部</button>
                      {PLATFORMS.map(k => (
                        <button key={k} onClick={() => { setPlatformFilter(k); setPage(1); setShowFilter(false); }}
                          className={`w-full text-left px-2 py-1 text-sm rounded ${platformFilter === k ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>{PLATFORM_MAP[k]}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={handleSearch} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">搜索</button>
              <button onClick={() => { setKeyword(""); setSearchKeyword(""); setPlatformFilter(""); setPage(1); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : !data || data.list.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Smartphone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">暂无新媒体账号</p>
                <button onClick={openNewForm} className="mt-3 text-blue-600 text-sm hover:underline">添加第一个账号</button>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">平台</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">账号名称</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">账号ID</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">粉丝数</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">最近表现</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">状态</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.list.map((acc) => {
                      const latestPerf = acc.performances && acc.performances.length > 0 ? acc.performances[0] : null;
                      return (
                        <tr key={acc.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4">
                            <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${PLATFORM_COLOR[acc.platform] || "bg-gray-100 text-gray-600"}`}>
                              {PLATFORM_MAP[acc.platform] || acc.platform}
                            </span>
                          </td>
                          <td className="px-6 py-4"><span className="text-sm font-medium text-gray-900">{acc.accountName}</span></td>
                          <td className="px-6 py-4"><span className="text-sm text-gray-500 font-mono">{acc.accountId || "-"}</span></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-gray-400" /><span className="text-sm font-medium text-gray-900">{formatNumber(acc.followers)}</span></div>
                          </td>
                          <td className="px-6 py-4">
                            {latestPerf ? (
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span title="曝光"><Eye className="w-3 h-3 inline" /> {formatNumber(latestPerf.impressions)}</span>
                                <span title="点击"><MousePointerClick className="w-3 h-3 inline" /> {formatNumber(latestPerf.clicks)}</span>
                                <span title="线索"><Target className="w-3 h-3 inline" /> {formatNumber(latestPerf.leads)}</span>
                              </div>
                            ) : <span className="text-xs text-gray-400">暂无数据</span>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${acc.status ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                              {acc.status ? "活跃" : "停用"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditForm(acc)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="编辑"><Edit3 className="w-4 h-4" /></button>
                              <button onClick={() => setDeleteConfirm(acc)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="删除"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
                  <div className="text-sm text-gray-500">共 {data.total} 条记录，第 {data.page}/{data.totalPages} 页</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"><ChevronLeft className="w-4 h-4" /></button>
                    {Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (data.totalPages <= 5) { pageNum = i + 1; }
                      else if (page <= 3) { pageNum = i + 1; }
                      else if (page >= data.totalPages - 2) { pageNum = data.totalPages - 4 + i; }
                      else { pageNum = page - 2 + i; }
                      return (
                        <button key={pageNum} onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 text-sm rounded transition ${pageNum === page ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}>{pageNum}</button>
                      );
                    })}
                    <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ============ Performances Tab ============ */}
      {tab === "performances" && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <select value={perfAccountFilter} onChange={(e) => { setPerfAccountFilter(e.target.value); setPerfPage(1); }}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">全部账号</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{PLATFORM_MAP[a.platform] || a.platform} - {a.accountName}</option>)}
                </select>
              </div>
              <button onClick={() => { setPerfAccountFilter(""); setPerfPage(1); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {perfLoading ? (
              <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : !perfData || perfData.list.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">暂无表现数据</p>
                <button onClick={openNewPerfForm} className="mt-3 text-blue-600 text-sm hover:underline">添加第一条数据</button>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">账号</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">日期</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">曝光量</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">点击量</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">线索数</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">粉丝增量</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {perfData.list.map((perf) => (
                      <tr key={perf.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          {perf.account ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">{perf.account.accountName}</div>
                              <div className="text-xs text-gray-400">{PLATFORM_MAP[perf.account.platform] || perf.account.platform}</div>
                            </div>
                          ) : <span className="text-sm text-gray-400">-</span>}
                        </td>
                        <td className="px-6 py-4"><span className="text-sm text-gray-700">{new Date(perf.statDate).toLocaleDateString("zh-CN")}</span></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-blue-400" /><span className="text-sm font-medium text-gray-900">{formatNumber(perf.impressions)}</span></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5"><MousePointerClick className="w-3.5 h-3.5 text-green-400" /><span className="text-sm font-medium text-gray-900">{formatNumber(perf.clicks)}</span></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-purple-400" /><span className="text-sm font-medium text-gray-900">{formatNumber(perf.leads)}</span></div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-medium ${perf.followersDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {perf.followersDelta >= 0 ? "+" : ""}{formatNumber(perf.followersDelta)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditPerfForm(perf)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="编辑"><Edit3 className="w-4 h-4" /></button>
                            <button onClick={() => setPerfDeleteConfirm(perf)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="删除"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {perfData && (
                  <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
                    <div className="text-sm text-gray-500">共 {perfData.total} 条记录，第 {perfData.page}/{perfData.totalPages} 页</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPerfPage((p) => Math.max(1, p - 1))} disabled={perfPage <= 1}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"><ChevronLeft className="w-4 h-4" /></button>
                      {Array.from({ length: Math.min(perfData.totalPages, 5) }, (_, i) => {
                        let pageNum: number;
                        if (perfData.totalPages <= 5) { pageNum = i + 1; }
                        else if (perfPage <= 3) { pageNum = i + 1; }
                        else if (perfPage >= perfData.totalPages - 2) { pageNum = perfData.totalPages - 4 + i; }
                        else { pageNum = perfPage - 2 + i; }
                        return (
                          <button key={pageNum} onClick={() => setPerfPage(pageNum)}
                            className={`w-8 h-8 text-sm rounded transition ${pageNum === perfPage ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}>{pageNum}</button>
                        );
                      })}
                      <button onClick={() => setPerfPage((p) => Math.min(perfData.totalPages, p + 1))} disabled={perfPage >= perfData.totalPages}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ============ Account Form Modal ============ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editingItem ? "编辑账号" : "新增账号"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">平台 <span className="text-red-500">*</span></label>
                <select required value={formData.platform} onChange={(e) => setFormData(d => ({ ...d, platform: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">请选择平台</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_MAP[p]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">账号名称 <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.accountName} onChange={(e) => setFormData(d => ({ ...d, accountName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="如: 新辰留学" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">账号ID</label>
                <input type="text" value={formData.accountId} onChange={(e) => setFormData(d => ({ ...d, accountId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="平台账号唯一ID" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">粉丝数</label>
                <input type="number" value={formData.followers} onChange={(e) => setFormData(d => ({ ...d, followers: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                  {submitting ? "保存中..." : editingItem ? "保存修改" : "确认新增"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-xl"><h2 className="text-lg font-semibold text-red-800">确认删除</h2></div>
            <div className="p-6">
              <p className="text-sm text-gray-700">确定要删除 {PLATFORM_MAP[deleteConfirm.platform] || deleteConfirm.platform} 账号 <span className="font-medium">{deleteConfirm.accountName}</span> 吗？</p>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button onClick={handleDelete} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition">确认删除</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ Performance Form Modal ============ */}
      {showPerfForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editingPerf ? "编辑表现数据" : "新增表现数据"}</h2>
              <button onClick={() => setShowPerfForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition">✕</button>
            </div>
            <form onSubmit={handlePerfSubmit} className="p-6 space-y-4">
              {perfFormError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{perfFormError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">账号 <span className="text-red-500">*</span></label>
                <select required value={perfFormData.accountId} onChange={(e) => setPerfFormData(d => ({ ...d, accountId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">请选择账号</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{PLATFORM_MAP[a.platform] || a.platform} - {a.accountName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">统计日期 <span className="text-red-500">*</span></label>
                <input type="date" required value={perfFormData.statDate} onChange={(e) => setPerfFormData(d => ({ ...d, statDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">曝光量</label>
                  <div className="relative">
                    <Eye className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="number" value={perfFormData.impressions} onChange={(e) => setPerfFormData(d => ({ ...d, impressions: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">点击量</label>
                  <div className="relative">
                    <MousePointerClick className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="number" value={perfFormData.clicks} onChange={(e) => setPerfFormData(d => ({ ...d, clicks: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">线索数</label>
                  <div className="relative">
                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="number" value={perfFormData.leads} onChange={(e) => setPerfFormData(d => ({ ...d, leads: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">粉丝增量</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="number" value={perfFormData.followersDelta} onChange={(e) => setPerfFormData(d => ({ ...d, followersDelta: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPerfForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={perfSubmitting} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                  {perfSubmitting ? "保存中..." : editingPerf ? "保存修改" : "确认新增"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Performance Delete Confirm Modal */}
      {perfDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-xl"><h2 className="text-lg font-semibold text-red-800">确认删除</h2></div>
            <div className="p-6">
              <p className="text-sm text-gray-700">确定要删除 {new Date(perfDeleteConfirm.statDate).toLocaleDateString("zh-CN")} 的表现数据吗？</p>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setPerfDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button onClick={handlePerfDelete} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition">确认删除</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
