"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, ChevronLeft, ChevronRight, RefreshCw,
  DollarSign, User, Calendar, MoreHorizontal, Trash2,
} from "lucide-react";

interface CostItem {
  id: number;
  studentId?: number;
  costType: string;
  amount: number;
  currency: string;
  fiscalYear: number;
  fiscalMonth: number;
  description?: string;
  attachmentUrl?: string;
  createdAt: string;
  student?: { id: number; name: string };
}

interface PaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: CostItem[];
}

const COST_TYPES = [
  "广告投放", "渠道佣金", "人员薪资", "办公租金",
  "差旅费用", "市场活动", "软件服务", "其他",
];

const CURRENCIES = ["CNY", "USD", "GBP", "AUD", "CAD", "SGD", "MYR"];

export default function CostsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [costTypeFilter, setCostTypeFilter] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [fiscalMonth, setFiscalMonth] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [showForm, setShowForm] = useState(false);
  const [editingCost, setEditingCost] = useState<CostItem | null>(null);
  const [formData, setFormData] = useState({
    studentId: "", costType: "", amount: "", currency: "CNY",
    fiscalYear: String(new Date().getFullYear()), fiscalMonth: String(new Date().getMonth() + 1),
    description: "", attachmentUrl: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<CostItem | null>(null);

  // 学生搜索
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<{ id: number; name: string; phone: string }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string; phone: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (costTypeFilter) params.set("costType", costTypeFilter);
      if (fiscalYear) params.set("fiscalYear", fiscalYear);
      if (fiscalMonth) params.set("fiscalMonth", fiscalMonth);
      const res = await fetch(`/api/costs?` + params.toString());
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch (err) {
      console.error("获取成本列表失败", err);
    } finally {
      setLoading(false);
    }
  }, [page, costTypeFilter, fiscalYear, fiscalMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 搜索学生
  useEffect(() => {
    if (!studentSearch || studentSearch.length < 1) { setStudentResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/students?keyword=` + encodeURIComponent(studentSearch) + `&pageSize=10`);
        const d = await res.json();
        setStudentResults(d.list || []);
      } catch { setStudentResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  function openNewForm() {
    setEditingCost(null);
    setFormData({
      studentId: "", costType: "", amount: "", currency: "CNY",
      fiscalYear: String(new Date().getFullYear()), fiscalMonth: String(new Date().getMonth() + 1),
      description: "", attachmentUrl: "",
    });
    setSelectedStudent(null);
    setStudentSearch("");
    setStudentResults([]);
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(c: CostItem) {
    setEditingCost(c);
    setFormData({
      studentId: c.studentId ? String(c.studentId) : "",
      costType: c.costType,
      amount: String(c.amount),
      currency: c.currency,
      fiscalYear: String(c.fiscalYear),
      fiscalMonth: String(c.fiscalMonth),
      description: c.description || "",
      attachmentUrl: c.attachmentUrl || "",
    });
    if (c.student) {
      setSelectedStudent({ id: c.student.id, name: c.student.name, phone: "" });
      setStudentSearch(c.student.name);
    } else {
      setSelectedStudent(null);
      setStudentSearch("");
    }
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const payload: any = {
        costType: formData.costType,
        amount: formData.amount,
        currency: formData.currency,
        fiscalYear: parseInt(formData.fiscalYear),
        fiscalMonth: parseInt(formData.fiscalMonth),
        description: formData.description || undefined,
        attachmentUrl: formData.attachmentUrl || undefined,
      };
      if (formData.studentId) payload.studentId = formData.studentId;
      const url = editingCost ? `/api/costs/` + editingCost.id : "/api/costs";
      const method = editingCost ? "PUT" : "POST";
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
      const res = await fetch(`/api/costs/` + deleteConfirm.id, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setDeleteConfirm(null);
      fetchData();
    } catch {
      setFormError("删除失败");
    }
  }

  function handleSearch() { setPage(1); fetchData(); }

  const now = new Date();
  const currentYear = now.getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">成本管理</h1>
          <p className="text-sm text-gray-500 mt-1">记录和管理各类运营成本，按会计期归类统计</p>
        </div>
        <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4" />新增成本
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={costTypeFilter} onChange={(e) => { setCostTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部类型</option>
            {COST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={fiscalYear} onChange={(e) => { setFiscalYear(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部年份</option>
            {yearOptions.map((y) => <option key={y} value={y}>{y}年</option>)}
          </select>
          <select value={fiscalMonth} onChange={(e) => { setFiscalMonth(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部月份</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}月</option>)}
          </select>
          <button onClick={handleSearch} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">搜索</button>
          <button onClick={() => { setCostTypeFilter(""); setFiscalYear(""); setFiscalMonth(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
        ) : !data || data.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <DollarSign className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无成本记录</p>
            <button onClick={openNewForm} className="mt-3 text-blue-600 text-sm hover:underline">添加第一条成本</button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">关联学生</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">成本类型</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">金额</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">币种</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">会计期</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">描述</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-700">{c.student?.name || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{c.costType}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">¥{Number(c.amount).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.currency}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.fiscalYear}年{c.fiscalMonth}月</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{c.description || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditForm(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="编辑">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(c)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="删除">
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
              <h2 className="text-lg font-semibold text-gray-900">{editingCost ? "编辑成本" : "新增成本"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">关联学生</label>
                <div className="relative">
                  <input type="text" value={studentSearch} onChange={(e) => { setStudentSearch(e.target.value); setSelectedStudent(null); setFormData((d) => ({ ...d, studentId: "" })); }}
                    placeholder="搜索学生（可选）..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  {studentResults.length > 0 && !selectedStudent && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                      {studentResults.map((s) => (
                        <button key={s.id} type="button" onClick={() => { setSelectedStudent(s); setStudentSearch(s.name); setFormData((d) => ({ ...d, studentId: String(s.id) })); setStudentResults([]); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition">
                          <span className="font-medium text-gray-900">{s.name}</span>
                          <span className="text-gray-400 ml-2">{s.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedStudent && <div className="mt-1 text-xs text-blue-600">已选择：{selectedStudent.name} ({selectedStudent.phone})</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">成本类型 <span className="text-red-500">*</span></label>
                <select required value={formData.costType} onChange={(e) => setFormData((d) => ({ ...d, costType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">请选择类型</option>
                  {COST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">金额 <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" min="0" required value={formData.amount} onChange={(e) => setFormData((d) => ({ ...d, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">币种</label>
                  <select value={formData.currency} onChange={(e) => setFormData((d) => ({ ...d, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">会计年份 <span className="text-red-500">*</span></label>
                  <select required value={formData.fiscalYear} onChange={(e) => setFormData((d) => ({ ...d, fiscalYear: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {yearOptions.map((y) => <option key={y} value={y}>{y}年</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">会计月份 <span className="text-red-500">*</span></label>
                  <select required value={formData.fiscalMonth} onChange={(e) => setFormData((d) => ({ ...d, fiscalMonth: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}月</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea value={formData.description} onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="成本说明..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                  {submitting ? "保存中..." : editingCost ? "保存修改" : "确认新增"}
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
              <p className="text-sm text-gray-700">确定要删除 {deleteConfirm.costType} 类型的成本记录（¥{Number(deleteConfirm.amount).toLocaleString()}）吗？</p>
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
