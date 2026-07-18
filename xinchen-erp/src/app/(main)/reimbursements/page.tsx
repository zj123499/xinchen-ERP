"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, ChevronLeft, ChevronRight, RefreshCw,
  DollarSign, User, Calendar, MoreHorizontal, Trash2,
  CheckCircle, XCircle, Send, CreditCard,
} from "lucide-react";

interface ReimbursementItem {
  id: number;
  applicantId: number;
  amount: number;
  category: string;
  description?: string;
  status: string;
  reviewedBy?: number;
  reviewNote?: string;
  paidAt?: string;
  createdAt: string;
  applicant: { id: number; realName: string; username: string };
}

interface PaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: ReimbursementItem[];
}

interface UserOption {
  id: number;
  realName: string;
  username: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "草稿", color: "bg-gray-100 text-gray-600" },
  SUBMITTED: { label: "已提交", color: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "已批准", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "已驳回", color: "bg-red-100 text-red-700" },
  PAID: { label: "已付款", color: "bg-blue-100 text-blue-700" },
};

const CATEGORIES = [
  "交通费", "住宿费", "餐饮费", "通讯费",
  "办公用品", "培训费", "招待费", "其他",
];

export default function ReimbursementsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [showForm, setShowForm] = useState(false);
  const [editingReimbursement, setEditingReimbursement] = useState<ReimbursementItem | null>(null);
  const [formData, setFormData] = useState({
    applicantId: "", amount: "", category: "", description: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<ReimbursementItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (categoryFilter) params.set("category", categoryFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/reimbursements?` + params.toString());
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch (err) {
      console.error("获取报销列表失败", err);
    } finally {
      setLoading(false);
    }
  }, [page, categoryFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch("/api/employees?pageSize=1000").then(r => r.json()).then(d => {
      setUsers(d.list || []);
    }).catch(() => {});
  }, []);

  function openNewForm() {
    setEditingReimbursement(null);
    setFormData({ applicantId: "", amount: "", category: "", description: "" });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(r: ReimbursementItem) {
    setEditingReimbursement(r);
    setFormData({
      applicantId: String(r.applicantId),
      amount: String(r.amount),
      category: r.category,
      description: r.description || "",
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
        applicantId: formData.applicantId,
        amount: formData.amount,
        category: formData.category,
        description: formData.description || undefined,
      };
      const url = editingReimbursement ? `/api/reimbursements/` + editingReimbursement.id : "/api/reimbursements";
      const method = editingReimbursement ? "PUT" : "POST";
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

  async function handleStatusChange(r: ReimbursementItem, newStatus: string) {
    try {
      await fetch(`/api/reimbursements/` + r.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchData();
    } catch {
      console.error("状态变更失败");
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/reimbursements/` + deleteConfirm.id, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setDeleteConfirm(null);
      fetchData();
    } catch {
      setFormError("删除失败");
    }
  }

  function handleSearch() { setPage(1); fetchData(); }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">报销管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理员工费用报销申请，支持审批和付款流程</p>
        </div>
        <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4" />新增报销
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部类别</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部状态</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={handleSearch} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">搜索</button>
          <button onClick={() => { setCategoryFilter(""); setStatusFilter(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
        ) : !data || data.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <DollarSign className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无报销记录</p>
            <button onClick={openNewForm} className="mt-3 text-blue-600 text-sm hover:underline">添加第一条报销</button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">申请人</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">类别</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">金额</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">描述</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">申请时间</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{r.applicant.realName || r.applicant.username}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{r.category}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">¥{Number(r.amount).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_MAP[r.status]?.color || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_MAP[r.status]?.label || r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{r.description || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(r.createdAt).toLocaleDateString("zh-CN")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {r.status === "DRAFT" && (
                          <button onClick={() => handleStatusChange(r, "SUBMITTED")} className="px-2 py-1 text-xs text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded transition" title="提交"><Send className="w-3 h-3" /></button>
                        )}
                        {r.status === "SUBMITTED" && (
                          <a href="/approval-records?scope=pending" className="px-2 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition inline-flex items-center gap-1" title="去审批">
                            <Send className="w-3 h-3" />审批中
                          </a>
                        )}
                        {r.status === "APPROVED" && (
                          <button onClick={() => handleStatusChange(r, "PAID")} className="px-2 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition" title="付款"><CreditCard className="w-3 h-3" /></button>
                        )}
                        <button onClick={() => openEditForm(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="编辑">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(r)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="删除">
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
              <h2 className="text-lg font-semibold text-gray-900">{editingReimbursement ? "编辑报销" : "新增报销"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">申请人 <span className="text-red-500">*</span></label>
                <select required value={formData.applicantId} onChange={(e) => setFormData((d) => ({ ...d, applicantId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">请选择申请人</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.user?.realName || u.user?.username || u.name || `员工${u.id}`}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">费用类别 <span className="text-red-500">*</span></label>
                <select required value={formData.category} onChange={(e) => setFormData((d) => ({ ...d, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">请选择类别</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">金额 <span className="text-red-500">*</span></label>
                <input type="number" step="0.01" min="0" required value={formData.amount} onChange={(e) => setFormData((d) => ({ ...d, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="报销金额" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea value={formData.description} onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="费用说明..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                  {submitting ? "保存中..." : editingReimbursement ? "保存修改" : "确认新增"}
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
              <p className="text-sm text-gray-700">确定要删除 {deleteConfirm.applicant.realName || deleteConfirm.applicant.username} 的 {deleteConfirm.category} 报销记录（¥{Number(deleteConfirm.amount).toLocaleString()}）吗？</p>
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
