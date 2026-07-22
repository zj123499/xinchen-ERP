"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, FileText, User, Trash2, Send,
  ChevronLeft, ChevronRight, Phone,
} from "lucide-react";

interface LeadItem {
  id: number; name: string; phone: string; wechat?: string;
  source: string; status: string; businessType?: string;
  targetCountry?: string; targetDegree?: string; createdAt: string;
  assignedTo: { id: number; realName: string; username: string };
  documentAssignedTo?: { id: number; realName: string } | null;
  student?: { id: number; name: string } | null;
}

interface AdvisorItem { id: number; realName: string; username: string; }

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
  const [activeTab, setActiveTab] = useState<TabKey>("interested");
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const pageSize = 20;

  // 三个 Tab 的独立计数（常显）
  const [tabCounts, setTabCounts] = useState({ signed: 0, interested: 0, uninterested: 0 });

  // 文书分配
  const [docWriters, setDocWriters] = useState<AdvisorItem[]>([]);
  const [docModal, setDocModal] = useState<LeadItem | null>(null);
  const [docWriterId, setDocWriterId] = useState("");

  // 初始化
  useEffect(() => {
    fetch("/api/advisors?roleCode=document_application")
      .then((r) => r.json())
      .then((d) => setDocWriters(d.list || []))
      .catch(() => {});
  }, []);

  // 加载数据
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      let statusParam = "";
      if (activeTab === "signed") statusParam = "CONVERTED";
      else if (activeTab === "interested") statusParam = "NEW,CONTACTED,QUALIFIED";
      else if (activeTab === "uninterested") statusParam = "DEAD";

      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (keyword) params.set("keyword", keyword);
      params.set("status", statusParam);

      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error(`请求失败(${res.status})`);
      const data = await res.json();
      setLeads(data.list || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page, keyword, activeTab]);

  // 并行查询 3 个 Tab 的计数（常显，不受当前 Tab 影响）
  const fetchTabCounts = useCallback(() => {
    const pid = new URLSearchParams();
    pid.set("pageSize", "1");
    if (keyword) pid.set("keyword", keyword);
    const baseUrl = `/api/leads?${pid.toString()}`;
    Promise.all([
      fetch(`${baseUrl}&status=CONVERTED`).then(r => r.json()).catch(() => ({ total: 0 })),
      fetch(`${baseUrl}&status=NEW,CONTACTED,QUALIFIED`).then(r => r.json()).catch(() => ({ total: 0 })),
      fetch(`${baseUrl}&status=DEAD`).then(r => r.json()).catch(() => ({ total: 0 })),
    ]).then(([s, i, u]) => {
      setTabCounts({ signed: s.total || 0, interested: i.total || 0, uninterested: u.total || 0 });
    });
  }, [keyword]);

  useEffect(() => { fetchLeads(); fetchTabCounts(); }, [fetchLeads, fetchTabCounts]);

  // 变更状态
  async function changeStatus(lead: LeadItem, newStatus: string) {
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      fetchLeads();
    } catch { alert("操作失败"); }
  }

  // 分配文书
  async function assignDocWriter() {
    if (!docModal || !docWriterId) return;
    try {
      await fetch(`/api/leads/${docModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentAssignedToId: parseInt(docWriterId) }),
      });
      setDocModal(null);
      setDocWriterId("");
      fetchLeads();
    } catch { alert("分配失败"); }
  }

  // 删除
  async function deleteLead(id: number) {
    if (!confirm("确定删除该记录？")) return;
    try { await fetch(`/api/leads/${id}`, { method: "DELETE" }); fetchLeads(); }
    catch { alert("删除失败"); }
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
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">跟进记录</h1>
          <p className="text-sm text-gray-500 mt-1">已签约客户 · 意向客户 · 无意向客户</p>
        </div>
        <button onClick={() => { setKeyword(""); setPage(1); }}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition" title="刷新">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 导航 */}
      <div className="flex gap-0 mb-4 border-b border-gray-200">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === tab.key ? tab.color : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {tab.label}
            <span className={`text-xs px-2 py-0.5 rounded-full ${tab.bg}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="搜索姓名/手机号..."
            value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); } }}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        {keyword && (
          <button onClick={() => { setKeyword(""); setPage(1); }}
            className="text-sm text-gray-500 hover:text-gray-700">清除</button>
        )}
      </div>

      {/* 数据表格 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-400">加载中...</div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <User className="w-16 h-16 mb-4 text-gray-200" />
            <p className="text-sm">暂无数据</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">客户</th>
                <th className="px-4 py-3">联系方式</th>
                {activeTab === "signed" && <th className="px-4 py-3">文书老师</th>}
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">顾问</th>
                <th className="px-4 py-3">时间</th>
                <th className="px-4 py-3 w-48">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{lead.name}</div>
                    {lead.businessType && <div className="text-xs text-gray-500 mt-0.5">{bizLabel(lead.businessType)}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />{lead.phone || "-"}
                    </div>
                  </td>
                  {activeTab === "signed" && (
                    <td className="px-4 py-3 text-sm">
                      {lead.documentAssignedTo ? (
                        <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs">
                          {lead.documentAssignedTo.realName}
                        </span>
                      ) : (
                        <button onClick={() => { setDocModal(lead); setDocWriterId(""); }}
                          className="text-xs text-blue-600 hover:underline">分配文书</button>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[lead.status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_MAP[lead.status] || lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{lead.assignedTo.realName}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(lead.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {activeTab === "interested" && (
                        <>
                          <button onClick={() => changeStatus(lead, "CONVERTED")}
                            className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition">
                            签约
                          </button>
                          <button onClick={() => changeStatus(lead, "DEAD")}
                            className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                            无意向
                          </button>
                        </>
                      )}
                      {activeTab === "signed" && (
                        <>
                          <button onClick={() => changeStatus(lead, "QUALIFIED")}
                            className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 transition">
                            退回意向
                          </button>
                        </>
                      )}
                      {activeTab === "uninterested" && (
                        <>
                          <button onClick={() => changeStatus(lead, "NEW")}
                            className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition">
                            移回意向
                          </button>
                        </>
                      )}
                      <button onClick={() => deleteLead(lead.id)}
                        className="text-xs px-2 py-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">共 {total} 条</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-700">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-30 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 文书分配弹窗 */}
      {docModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDocModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">分配文书老师</h3>
              <button onClick={() => setDocModal(null)} className="text-gray-400 hover:text-gray-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">客户：{docModal.name}</p>
            <select value={docWriterId} onChange={(e) => setDocWriterId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">选择文书老师</option>
              {docWriters.map((d) => (
                <option key={d.id} value={d.id}>{d.realName}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button onClick={assignDocWriter} disabled={!docWriterId}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition">
                确定分配
              </button>
              <button onClick={() => setDocModal(null)}
                className="py-2 px-6 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
