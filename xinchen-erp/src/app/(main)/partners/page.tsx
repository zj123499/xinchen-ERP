"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, ChevronLeft, ChevronRight, RefreshCw,
  Building2, Phone, Mail, Globe, MoreHorizontal, Trash2, User,
} from "lucide-react";

interface PartnerItem {
  id: number;
  name: string;
  type: string;
  country?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  commissionRate?: number;
  status: boolean;
  createdAt: string;
}

interface PaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: PartnerItem[];
}

const PARTNER_TYPE_MAP: Record<string, string> = {
  SCHOOL: "院校",
  AGENCY: "中介机构",
  LANGUAGE_SCHOOL: "语言学校",
  RENTAL: "租房合作",
  SERVICE: "境外服务",
  OTHER: "其他",
};

const TYPE_COLOR_MAP: Record<string, string> = {
  SCHOOL: "bg-purple-100 text-purple-700",
  AGENCY: "bg-blue-100 text-blue-700",
  LANGUAGE_SCHOOL: "bg-teal-100 text-teal-700",
  RENTAL: "bg-orange-100 text-orange-700",
  SERVICE: "bg-green-100 text-green-700",
  OTHER: "bg-gray-100 text-gray-600",
};

export default function PartnersPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [showForm, setShowForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerItem | null>(null);
  const [formData, setFormData] = useState({
    name: "", type: "SCHOOL", country: "",
    contactName: "", contactPhone: "", contactEmail: "", commissionRate: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<PartnerItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/partners?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch (err) {
      console.error("获取合作方列表失败", err);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, typeFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openNewForm() {
    setEditingPartner(null);
    setFormData({ name: "", type: "SCHOOL", country: "", contactName: "", contactPhone: "", contactEmail: "", commissionRate: "" });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(p: PartnerItem) {
    setEditingPartner(p);
    setFormData({
      name: p.name,
      type: p.type,
      country: p.country || "",
      contactName: p.contactName || "",
      contactPhone: p.contactPhone || "",
      contactEmail: p.contactEmail || "",
      commissionRate: p.commissionRate != null ? String(p.commissionRate) : "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        commissionRate: formData.commissionRate || undefined,
      };
      const url = editingPartner ? `/api/partners/${editingPartner.id}` : "/api/partners";
      const method = editingPartner ? "PUT" : "POST";
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
      const res = await fetch(`/api/partners/${deleteConfirm.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setDeleteConfirm(null);
      fetchData();
    } catch {
      setFormError("删除失败");
    }
  }

  async function toggleStatus(p: PartnerItem) {
    try {
      await fetch(`/api/partners/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: !p.status }),
      });
      fetchData();
    } catch {
      console.error("切换状态失败");
    }
  }

  function handleSearch() { setPage(1); fetchData(); }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">合作方管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理院校、中介、境外服务等合作方信息</p>
        </div>
        <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4" />新增合作方
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="搜索合作方名称、联系人、国家..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部类型</option>
            {Object.entries(PARTNER_TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部状态</option>
            <option value="active">合作中</option>
            <option value="inactive">已停用</option>
          </select>
          <button onClick={handleSearch} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">搜索</button>
          <button onClick={() => { setKeyword(""); setTypeFilter(""); setStatusFilter(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
        ) : !data || data.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Building2 className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无合作方数据</p>
            <button onClick={openNewForm} className="mt-3 text-blue-600 text-sm hover:underline">添加第一个合作方</button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">合作方</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">国家</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">联系人</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">佣金比例</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="text-sm font-medium text-gray-900">{p.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLOR_MAP[p.type] || "bg-gray-100 text-gray-600"}`}>
                        {PARTNER_TYPE_MAP[p.type] || p.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.country ? <span className="text-sm text-gray-600 flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-gray-400" />{p.country}</span> : <span className="text-sm text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      {p.contactName && <div className="text-sm text-gray-700 flex items-center gap-1"><User className="w-3.5 h-3.5 text-gray-400" />{p.contactName}</div>}
                      {p.contactPhone && <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{p.contactPhone}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {p.commissionRate != null ? `${p.commissionRate}%` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleStatus(p)}
                        className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full transition ${p.status ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                        {p.status ? "合作中" : "已停用"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditForm(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="编辑">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(p)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="删除">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-sm text-gray-500">共 {data.total} 条，第 {data.page}/{data.totalPages} 页</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, data.totalPages - 4));
                  const p = start + i;
                  if (p > data.totalPages) return null;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 text-sm rounded transition ${p === page ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}>{p}</button>
                  );
                })}
                <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                  className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editingPartner ? "编辑合作方" : "新增合作方"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">合作方名称 <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类型 <span className="text-red-500">*</span></label>
                  <select required value={formData.type} onChange={(e) => setFormData((d) => ({ ...d, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {Object.entries(PARTNER_TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">国家/地区</label>
                <input type="text" value={formData.country} onChange={(e) => setFormData((d) => ({ ...d, country: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如：马来西亚" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
                  <input type="text" value={formData.contactName} onChange={(e) => setFormData((d) => ({ ...d, contactName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                  <input type="text" value={formData.contactPhone} onChange={(e) => setFormData((d) => ({ ...d, contactPhone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系邮箱</label>
                  <input type="email" value={formData.contactEmail} onChange={(e) => setFormData((d) => ({ ...d, contactEmail: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">佣金比例 (%)</label>
                  <input type="number" step="0.01" min="0" max="100" value={formData.commissionRate} onChange={(e) => setFormData((d) => ({ ...d, commissionRate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="如：15" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                  {submitting ? "保存中..." : editingPartner ? "保存修改" : "确认新增"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-xl">
              <h2 className="text-lg font-semibold text-red-800">确认删除</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">确定要删除合作方 <strong>{deleteConfirm.name}</strong> 吗？此操作不可撤销。</p>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button onClick={handleDelete} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition">确认删除</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
