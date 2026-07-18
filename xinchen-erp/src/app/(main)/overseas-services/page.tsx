"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, ChevronLeft, ChevronRight, RefreshCw,
  Globe, User, Phone, Calendar, Filter, Plus,
  Trash2, Edit3, FileText,
} from "lucide-react";

interface OverseasServiceItem {
  id: number;
  studentId: number;
  serviceType: string;
  status: string;
  detail: any;
  createdAt: string;
  student: { id: number; name: string; phone: string };
}

interface PaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: OverseasServiceItem[];
}

interface StudentOption {
  id: number;
  name: string;
  phone: string;
}

const SERVICE_TYPE_MAP: Record<string, string> = {
  visa_assist: "签证协助",
  airport_pickup: "机场接机",
  accommodation: "住宿安排",
  bank_account: "银行开户",
  sim_card: "手机卡办理",
  police_registration: "警局注册",
  insurance: "保险办理",
  other: "其他",
};

const SERVICE_TYPE_COLOR: Record<string, string> = {
  visa_assist: "bg-blue-100 text-blue-700",
  airport_pickup: "bg-green-100 text-green-700",
  accommodation: "bg-purple-100 text-purple-700",
  bank_account: "bg-yellow-100 text-yellow-700",
  sim_card: "bg-cyan-100 text-cyan-700",
  police_registration: "bg-red-100 text-red-700",
  insurance: "bg-indigo-100 text-indigo-700",
  other: "bg-gray-100 text-gray-600",
};

const STATUS_MAP: Record<string, string> = {
  pending: "待处理",
  processing: "处理中",
  completed: "已完成",
  cancelled: "已取消",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

const SERVICE_TYPES = Object.keys(SERVICE_TYPE_MAP);

export default function OverseasServicesPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const pageSize = 20;

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<OverseasServiceItem | null>(null);
  const [formData, setFormData] = useState({
    studentId: "", serviceType: "", status: "pending", detail: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<OverseasServiceItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchKeyword) params.set("keyword", searchKeyword);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (typeFilter) params.set("serviceType", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/overseas-services?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch (err) {
      console.error("获取境外服务失败", err);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, page, typeFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch("/api/students?pageSize=200").then(r => r.json()).then(d => {
      setStudents(d.list || []);
    }).catch(() => {});
  }, []);

  function openNewForm() {
    setEditingItem(null);
    setFormData({ studentId: "", serviceType: "", status: "pending", detail: "" });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(item: OverseasServiceItem) {
    setEditingItem(item);
    setFormData({
      studentId: String(item.studentId),
      serviceType: item.serviceType,
      status: item.status,
      detail: item.detail ? (typeof item.detail === "string" ? item.detail : JSON.stringify(item.detail, null, 2)) : "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      let detailParsed: any = undefined;
      if (formData.detail.trim()) {
        try {
          detailParsed = JSON.parse(formData.detail);
        } catch {
          detailParsed = { note: formData.detail };
        }
      }
      const payload: any = {
        studentId: formData.studentId,
        serviceType: formData.serviceType,
        status: formData.status,
        detail: detailParsed,
      };
      const url = editingItem ? `/api/overseas-services/${editingItem.id}` : "/api/overseas-services";
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
      await fetch(`/api/overseas-services/${deleteConfirm.id}`, { method: "DELETE" });
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

  function renderDetail(detail: any) {
    if (!detail) return "-";
    if (typeof detail === "string") return detail;
    try {
      const entries = Object.entries(detail);
      if (entries.length === 0) return "-";
      return entries.map(([k, v]) => `${k}: ${v}`).join(", ");
    } catch {
      return "-";
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">境外服务</h1>
          <p className="text-sm text-gray-500 mt-1">管理留学生境外落地服务，包括签证、接机、住宿等</p>
        </div>
        <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4" />新增服务
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="搜索学生姓名或手机号..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="relative">
            <button onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition ${(typeFilter || statusFilter) ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
              <Filter className="w-4 h-4" /> 筛选 {(typeFilter || statusFilter) && <span className="w-2 h-2 rounded-full bg-blue-500" />}
            </button>
            {showFilter && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-3 min-w-[200px]">
                <div className="text-xs font-medium text-gray-500 mb-2">服务类型</div>
                <div className="space-y-1 mb-3">
                  <button onClick={() => { setTypeFilter(""); setPage(1); }}
                    className={`w-full text-left px-2 py-1 text-sm rounded ${!typeFilter ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>全部</button>
                  {SERVICE_TYPES.map(k => (
                    <button key={k} onClick={() => { setTypeFilter(k); setPage(1); }}
                      className={`w-full text-left px-2 py-1 text-sm rounded ${typeFilter === k ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>{SERVICE_TYPE_MAP[k]}</button>
                  ))}
                </div>
                <div className="text-xs font-medium text-gray-500 mb-2">状态</div>
                <div className="space-y-1">
                  <button onClick={() => { setStatusFilter(""); setPage(1); }}
                    className={`w-full text-left px-2 py-1 text-sm rounded ${!statusFilter ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>全部</button>
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <button key={k} onClick={() => { setStatusFilter(k); setPage(1); }}
                      className={`w-full text-left px-2 py-1 text-sm rounded ${statusFilter === k ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>{v}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={handleSearch} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">搜索</button>
          <button onClick={() => { setKeyword(""); setSearchKeyword(""); setTypeFilter(""); setStatusFilter(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : !data || data.list.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">暂无境外服务记录</p>
            <button onClick={openNewForm} className="mt-3 text-blue-600 text-sm hover:underline">添加第一条服务记录</button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">学生</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">服务类型</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">详情</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">状态</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">创建时间</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((svc) => (
                  <tr key={svc.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-teal-600" /></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{svc.student.name}</div>
                          <div className="text-xs text-gray-400 flex items-center gap-0.5"><Phone className="w-3 h-3" /> {svc.student.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${SERVICE_TYPE_COLOR[svc.serviceType] || "bg-gray-100 text-gray-600"}`}>
                        {SERVICE_TYPE_MAP[svc.serviceType] || svc.serviceType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700 max-w-[250px] truncate" title={renderDetail(svc.detail)}>{renderDetail(svc.detail)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[svc.status] || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_MAP[svc.status] || svc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4"><span className="text-sm text-gray-500">{new Date(svc.createdAt).toLocaleString("zh-CN")}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditForm(svc)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="编辑"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteConfirm(svc)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="删除"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editingItem ? "编辑服务" : "新增服务"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学生 <span className="text-red-500">*</span></label>
                <select required value={formData.studentId} onChange={(e) => setFormData(d => ({ ...d, studentId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">请选择学生</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} - {s.phone}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">服务类型 <span className="text-red-500">*</span></label>
                <select required value={formData.serviceType} onChange={(e) => setFormData(d => ({ ...d, serviceType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">请选择服务类型</option>
                  {SERVICE_TYPES.map(t => <option key={t} value={t}>{SERVICE_TYPE_MAP[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select value={formData.status} onChange={(e) => setFormData(d => ({ ...d, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">详情 (JSON格式)</label>
                <textarea value={formData.detail} onChange={(e) => setFormData(d => ({ ...d, detail: e.target.value }))} rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  placeholder='{"key": "value"} 或纯文本描述' />
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

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-xl"><h2 className="text-lg font-semibold text-red-800">确认删除</h2></div>
            <div className="p-6">
              <p className="text-sm text-gray-700">确定要删除 {deleteConfirm.student.name} 的 {SERVICE_TYPE_MAP[deleteConfirm.serviceType] || deleteConfirm.serviceType} 服务记录吗？</p>
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
