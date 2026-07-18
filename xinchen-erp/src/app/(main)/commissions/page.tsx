"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, ChevronLeft, ChevronRight, RefreshCw,
  DollarSign, User, Calendar, MoreHorizontal, Trash2, Filter,
} from "lucide-react";

interface CommissionItem {
  id: number;
  studentId: number;
  ruleId: number;
  orderId?: number;
  employeeId: number;
  amount: number;
  status: string;
  milestoneKey?: string;
  releaseRatio?: number;
  releasedAt?: string;
  fiscalYear: number;
  fiscalMonth: number;
  createdAt: string;
  student: { id: number; name: string; phone: string };
  rule: { id: number; name: string; ruleType: string; version?: number };
}

interface PaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: CommissionItem[];
}

interface EmployeeOption {
  id: number;
  name: string;
  employeeNo: string;
}

interface RuleOption {
  id: number;
  name: string;
  ruleType: string;
}

const COMMISSION_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待发放", color: "bg-yellow-100 text-yellow-700" },
  RELEASED: { label: "已发放", color: "bg-green-100 text-green-700" },
  ADJUSTED: { label: "已调整", color: "bg-blue-100 text-blue-700" },
  CANCELLED: { label: "已取消", color: "bg-gray-100 text-gray-500" },
};

const MILESTONE_MAP: Record<string, string> = {
  SIGN_CONTRACT: "签约",
  FIRST_PAYMENT: "首款到账",
  FULL_PAYMENT: "全款到账",
  OFFER_RECEIVED: "拿到Offer",
  VISA_APPROVED: "签证通过",
  ENROLLED: "入学",
};

export default function CommissionsPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [fiscalMonth, setFiscalMonth] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [showForm, setShowForm] = useState(false);
  const [editingCommission, setEditingCommission] = useState<CommissionItem | null>(null);
  const [formData, setFormData] = useState({
    studentId: "", ruleId: "", orderId: "", employeeId: "",
    amount: "", milestoneKey: "", fiscalYear: String(new Date().getFullYear()), fiscalMonth: String(new Date().getMonth() + 1),
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [rules, setRules] = useState<RuleOption[]>([]);

  const [deleteConfirm, setDeleteConfirm] = useState<CommissionItem | null>(null);

  // 搜索学生
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<{ id: number; name: string; phone: string }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string; phone: string } | null>(null);
  const [searchingStudent, setSearchingStudent] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      if (statusFilter) params.set("status", statusFilter);
      if (employeeFilter) params.set("employeeId", employeeFilter);
      if (fiscalYear) params.set("fiscalYear", fiscalYear);
      if (fiscalMonth) params.set("fiscalMonth", fiscalMonth);
      const res = await fetch(`/api/commissions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch (err) {
      console.error("获取提成列表失败", err);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, statusFilter, employeeFilter, fiscalYear, fiscalMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch("/api/employees?pageSize=100").then(r => r.json()).then(d => {
      setEmployees(d.list?.map((e: EmployeeOption) => ({ id: e.id, name: e.name, employeeNo: e.employeeNo })) || []);
    }).catch(() => {});
    fetch("/api/commission-rules").then(r => r.json()).then(d => {
      setRules(d.list || []);
    }).catch(() => {});
  }, []);

  // 搜索学生
  useEffect(() => {
    if (!studentSearch || studentSearch.length < 1) { setStudentResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingStudent(true);
      try {
        const res = await fetch(`/api/students?keyword=${encodeURIComponent(studentSearch)}&pageSize=10`);
        const d = await res.json();
        setStudentResults(d.list || []);
      } catch { setStudentResults([]); }
      finally { setSearchingStudent(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  function openNewForm() {
    setEditingCommission(null);
    setFormData({
      studentId: "", ruleId: "", orderId: "", employeeId: "",
      amount: "", milestoneKey: "", fiscalYear: String(new Date().getFullYear()), fiscalMonth: String(new Date().getMonth() + 1),
    });
    setSelectedStudent(null);
    setStudentSearch("");
    setStudentResults([]);
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(c: CommissionItem) {
    setEditingCommission(c);
    setFormData({
      studentId: String(c.studentId),
      ruleId: String(c.ruleId),
      orderId: c.orderId ? String(c.orderId) : "",
      employeeId: String(c.employeeId),
      amount: String(c.amount),
      milestoneKey: c.milestoneKey || "",
      fiscalYear: String(c.fiscalYear),
      fiscalMonth: String(c.fiscalMonth),
    });
    setSelectedStudent(c.student);
    setStudentSearch(c.student.name);
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
        studentId: formData.studentId,
        orderId: formData.orderId || undefined,
        amount: formData.amount,
        milestoneKey: formData.milestoneKey || undefined,
        fiscalYear: parseInt(formData.fiscalYear),
        fiscalMonth: parseInt(formData.fiscalMonth),
      };
      const url = editingCommission ? `/api/commissions/${editingCommission.id}` : "/api/commissions";
      const method = editingCommission ? "PUT" : "POST";
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

  async function handleRelease(c: CommissionItem) {
    try {
      await fetch(`/api/commissions/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RELEASED", releaseRatio: 1 }),
      });
      fetchData();
    } catch {
      console.error("发放失败");
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/commissions/${deleteConfirm.id}`, { method: "DELETE" });
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
          <h1 className="text-2xl font-bold text-gray-900">提成管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理销售顾问的提成明细，支持发放和调整</p>
        </div>
        <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4" />新增提成
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="搜索学生姓名..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部状态</option>
            {Object.entries(COMMISSION_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
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
          <button onClick={handleSearch} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">搜索</button>
          <button onClick={() => { setKeyword(""); setStatusFilter(""); setEmployeeFilter(""); setFiscalYear(""); setFiscalMonth(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
        ) : !data || data.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <DollarSign className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无提成记录</p>
            <button onClick={openNewForm} className="mt-3 text-blue-600 text-sm hover:underline">添加第一条提成</button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学生</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">提成规则</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">金额</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">节点</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">会计期</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{c.student.name}</div>
                      <div className="text-xs text-gray-400">{c.student.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.rule.name}{c.rule.version ? <span className="text-xs text-gray-400 ml-1">v{c.rule.version}</span> : null}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-900">¥{Number(c.amount).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${COMMISSION_STATUS_MAP[c.status]?.color || "bg-gray-100 text-gray-600"}`}>
                        {COMMISSION_STATUS_MAP[c.status]?.label || c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.milestoneKey ? (MILESTONE_MAP[c.milestoneKey] || c.milestoneKey) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.fiscalYear}年{c.fiscalMonth}月
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {c.status === "PENDING" && (
                          <button onClick={() => handleRelease(c)} className="px-2 py-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded transition">发放</button>
                        )}
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
              <h2 className="text-lg font-semibold text-gray-900">{editingCommission ? "编辑提成" : "新增提成"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学生 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type="text" value={studentSearch} onChange={(e) => { setStudentSearch(e.target.value); setSelectedStudent(null); setFormData((d) => ({ ...d, studentId: "" })); }}
                    placeholder="搜索学生姓名或手机号..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">员工 <span className="text-red-500">*</span></label>
                <select required value={formData.employeeId} onChange={(e) => setFormData((d) => ({ ...d, employeeId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">请选择员工</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.employeeNo})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">提成规则 <span className="text-red-500">*</span></label>
                <select required value={formData.ruleId} onChange={(e) => setFormData((d) => ({ ...d, ruleId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">请选择规则</option>
                  {rules.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.ruleType})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">金额 <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" min="0" required value={formData.amount} onChange={(e) => setFormData((d) => ({ ...d, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="提成金额" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">里程碑节点</label>
                  <select value={formData.milestoneKey} onChange={(e) => setFormData((d) => ({ ...d, milestoneKey: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">请选择</option>
                    {Object.entries(MILESTONE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">会计年份</label>
                  <select value={formData.fiscalYear} onChange={(e) => setFormData((d) => ({ ...d, fiscalYear: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {yearOptions.map((y) => <option key={y} value={y}>{y}年</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">会计月份</label>
                  <select value={formData.fiscalMonth} onChange={(e) => setFormData((d) => ({ ...d, fiscalMonth: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}月</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                  {submitting ? "保存中..." : editingCommission ? "保存修改" : "确认新增"}
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
              <p className="text-sm text-gray-700">确定要删除学生 <strong>{deleteConfirm.student.name}</strong> 的提成记录（¥{Number(deleteConfirm.amount).toLocaleString()}）吗？</p>
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
