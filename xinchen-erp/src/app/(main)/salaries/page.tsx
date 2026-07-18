"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, ChevronLeft, ChevronRight, RefreshCw,
  DollarSign, User, Calendar, MoreHorizontal, Trash2,
} from "lucide-react";

interface SalaryItem {
  id: number;
  employeeId: number;
  fiscalYear: number;
  fiscalMonth: number;
  baseSalary: number;
  bonus: number;
  commission: number;
  deduction: number;
  netSalary: number;
  status: string;
  createdAt: string;
  employee: { id: number; name: string; employeeNo: string };
}

interface PaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: SalaryItem[];
}

interface EmployeeOption {
  id: number;
  name: string;
  employeeNo: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-600" },
  confirmed: { label: "已确认", color: "bg-blue-100 text-blue-700" },
  paid: { label: "已发放", color: "bg-green-100 text-green-700" },
};

export default function SalariesPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [fiscalMonth, setFiscalMonth] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [showForm, setShowForm] = useState(false);
  const [editingSalary, setEditingSalary] = useState<SalaryItem | null>(null);
  const [formData, setFormData] = useState({
    employeeId: "", fiscalYear: String(new Date().getFullYear()), fiscalMonth: String(new Date().getMonth() + 1),
    baseSalary: "", bonus: "", commission: "", deduction: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<SalaryItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      if (employeeFilter) params.set("employeeId", employeeFilter);
      if (fiscalYear) params.set("fiscalYear", fiscalYear);
      if (fiscalMonth) params.set("fiscalMonth", fiscalMonth);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/salaries?` + params.toString());
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch (err) {
      console.error("获取薪资列表失败", err);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, employeeFilter, fiscalYear, fiscalMonth, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch("/api/employees?pageSize=100").then(r => r.json()).then(d => {
      setEmployees(d.list?.map((e: EmployeeOption) => ({ id: e.id, name: e.name, employeeNo: e.employeeNo })) || []);
    }).catch(() => {});
  }, []);

  function openNewForm() {
    setEditingSalary(null);
    setFormData({
      employeeId: "", fiscalYear: String(new Date().getFullYear()), fiscalMonth: String(new Date().getMonth() + 1),
      baseSalary: "", bonus: "", commission: "", deduction: "",
    });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(s: SalaryItem) {
    setEditingSalary(s);
    setFormData({
      employeeId: String(s.employeeId),
      fiscalYear: String(s.fiscalYear),
      fiscalMonth: String(s.fiscalMonth),
      baseSalary: String(s.baseSalary),
      bonus: String(s.bonus),
      commission: String(s.commission),
      deduction: String(s.deduction),
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
        employeeId: formData.employeeId,
        fiscalYear: parseInt(formData.fiscalYear),
        fiscalMonth: parseInt(formData.fiscalMonth),
        baseSalary: formData.baseSalary,
        bonus: formData.bonus,
        commission: formData.commission,
        deduction: formData.deduction,
      };
      const url = editingSalary ? `/api/salaries/` + editingSalary.id : "/api/salaries";
      const method = editingSalary ? "PUT" : "POST";
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

  async function handleStatusChange(s: SalaryItem, newStatus: string) {
    try {
      await fetch(`/api/salaries/` + s.id, {
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
      const res = await fetch(`/api/salaries/` + deleteConfirm.id, { method: "DELETE" });
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

  const calcNet = () => {
    const b = parseFloat(formData.baseSalary) || 0;
    const bn = parseFloat(formData.bonus) || 0;
    const cm = parseFloat(formData.commission) || 0;
    const dd = parseFloat(formData.deduction) || 0;
    return b + bn + cm - dd;
  };


  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">薪资管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理员工月度薪资，自动计算实发工资</p>
        </div>
        <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4" />新增薪资
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="搜索员工姓名..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <select value={employeeFilter} onChange={(e) => { setEmployeeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部员工</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
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
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部状态</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={handleSearch} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">搜索</button>
          <button onClick={() => { setKeyword(""); setEmployeeFilter(""); setFiscalYear(""); setFiscalMonth(""); setStatusFilter(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
        ) : !data || data.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <DollarSign className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无薪资记录</p>
            <button onClick={openNewForm} className="mt-3 text-blue-600 text-sm hover:underline">添加第一条薪资</button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">员工</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">会计期</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">基本工资</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">奖金</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">提成</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">扣款</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">实发工资</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{s.employee.name}</div>
                      <div className="text-xs text-gray-400">{s.employee.employeeNo}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{s.fiscalYear}年{s.fiscalMonth}月</td>
                    <td className="px-4 py-3 text-sm text-gray-700">¥{Number(s.baseSalary).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">¥{Number(s.bonus).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">¥{Number(s.commission).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-sm text-red-600">¥{Number(s.deduction).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-blue-700">¥{Number(s.netSalary).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_MAP[s.status]?.color || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_MAP[s.status]?.label || s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {s.status === "draft" && (
                          <button onClick={() => handleStatusChange(s, "confirmed")} className="px-2 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition">确认</button>
                        )}
                        {s.status === "confirmed" && (
                          <button onClick={() => handleStatusChange(s, "paid")} className="px-2 py-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded transition">发放</button>
                        )}
                        <button onClick={() => openEditForm(s)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="编辑">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(s)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="删除">
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
              <h2 className="text-lg font-semibold text-gray-900">{editingSalary ? "编辑薪资" : "新增薪资"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">员工 <span className="text-red-500">*</span></label>
                <select required value={formData.employeeId} onChange={(e) => setFormData((d) => ({ ...d, employeeId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" disabled={!!editingSalary}>
                  <option value="">请选择员工</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.employeeNo})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">会计年份 <span className="text-red-500">*</span></label>
                  <select required value={formData.fiscalYear} onChange={(e) => setFormData((d) => ({ ...d, fiscalYear: e.target.value }))} disabled={!!editingSalary}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {yearOptions.map((y) => <option key={y} value={y}>{y}年</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">会计月份 <span className="text-red-500">*</span></label>
                  <select required value={formData.fiscalMonth} onChange={(e) => setFormData((d) => ({ ...d, fiscalMonth: e.target.value }))} disabled={!!editingSalary}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}月</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">基本工资 <span className="text-red-500">*</span></label>
                <input type="number" step="0.01" min="0" required value={formData.baseSalary} onChange={(e) => setFormData((d) => ({ ...d, baseSalary: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="基本工资金额" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">奖金</label>
                  <input type="number" step="0.01" min="0" value={formData.bonus} onChange={(e) => setFormData((d) => ({ ...d, bonus: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">提成</label>
                  <input type="number" step="0.01" min="0" value={formData.commission} onChange={(e) => setFormData((d) => ({ ...d, commission: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">扣款</label>
                  <input type="number" step="0.01" min="0" value={formData.deduction} onChange={(e) => setFormData((d) => ({ ...d, deduction: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="0" />
                </div>
              </div>
              {formData.baseSalary && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-gray-600">实发工资（自动计算）</div>
                  <div className="text-2xl font-bold text-blue-700 mt-1">
                    ¥{calcNet().toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">基本工资 + 奖金 + 提成 - 扣款</div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                  {submitting ? "保存中..." : editingSalary ? "保存修改" : "确认新增"}
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
              <p className="text-sm text-gray-700">确定要删除 <strong>{deleteConfirm.employee.name}</strong> {deleteConfirm.fiscalYear}年{deleteConfirm.fiscalMonth}月的薪资记录吗？</p>
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
