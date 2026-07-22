"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, FileText, MoreHorizontal, ChevronLeft, ChevronRight,
  RefreshCw, User, Calendar, DollarSign,
} from "lucide-react";

interface ContractItem {
  id: number;
  contractNo: string;
  signDate: string;
  totalAmount: string;
  currency: string;
  status: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  student: { id: number; name: string; phone: string };
  businessLine?: { id: number; name: string } | null;
  _count: { orders: number };
}

interface PaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: ContractItem[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "草稿", color: "bg-gray-100 text-gray-800" },
  PENDING: { label: "待审批", color: "bg-yellow-100 text-yellow-800" },
  APPROVED: { label: "已审批", color: "bg-blue-100 text-blue-800" },
  SIGNED: { label: "已签署", color: "bg-green-100 text-green-800" },
  TERMINATED: { label: "已终止", color: "bg-red-100 text-red-800" },
  EXPIRED: { label: "已过期", color: "bg-gray-100 text-gray-600" },
};

const CURRENCY_MAP: Record<string, string> = {
  CNY: "¥", USD: "$", GBP: "£", AUD: "A$", CAD: "C$", SGD: "S$", MYR: "RM",
};

export default function ContractsPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // 新增/编辑弹窗
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractItem | null>(null);
  const [formData, setFormData] = useState({
    studentId: "",
    contractNo: "",
    businessLineId: "",
    signDate: new Date().toISOString().split("T")[0],
    totalAmount: "",
    currency: "CNY",
    status: "DRAFT",
    content: "",
    remark: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 学生搜索
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<{ id: number; name: string; phone: string }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string } | null>(null);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/contracts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("获取合同列表失败:", err);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, statusFilter]);

  useEffect(() => {
    fetchContracts();
    fetch("/api/students?pageSize=200").then(r => r.json()).then(d => {
      if (d.list?.length) setAllStudents(d.list);
    }).catch(() => {});
  }, [fetchContracts]);

  const loadRecentStudents = () => { fetch("/api/students?pageSize=20").then(r => r.json()).then(d => setStudentResults(d.list || [])).catch(() => {}); };

  // 学生搜索防抖
  useEffect(() => {
    if (studentSearch.length < 2) { loadRecentStudents(); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/students?keyword=${encodeURIComponent(studentSearch)}&pageSize=10`);
        const result = await res.json();
        setStudentResults(result.list || []);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  function openNewForm() {
    setEditingContract(null);
    setSelectedStudent(null);
    setStudentSearch("");
    setStudentResults([]);
    setFormData({
      studentId: "",
      contractNo: "",
      businessLineId: "",
      signDate: new Date().toISOString().split("T")[0],
      totalAmount: "",
      currency: "CNY",
      status: "DRAFT",
      content: "",
      remark: "",
    });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(contract: ContractItem) {
    setEditingContract(contract);
    setSelectedStudent({ id: contract.student.id, name: contract.student.name });
    setStudentSearch(contract.student.name);
    setFormData({
      studentId: String(contract.student.id),
      contractNo: contract.contractNo,
      businessLineId: contract.businessLine?.id ? String(contract.businessLine.id) : "",
      signDate: contract.signDate ? new Date(contract.signDate).toISOString().split("T")[0] : "",
      totalAmount: contract.totalAmount,
      currency: contract.currency,
      status: contract.status,
      content: "",
      remark: contract.remark || "",
    });
    setFormError("");
    setShowForm(true);
  }

  function selectStudent(s: { id: number; name: string; phone: string }) {
    setSelectedStudent({ id: s.id, name: s.name });
    setStudentSearch(s.name);
    setStudentResults([]);
    setFormData((d) => ({ ...d, studentId: String(s.id) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        totalAmount: parseFloat(formData.totalAmount),
        businessLineId: formData.businessLineId || undefined,
      };

      const url = editingContract ? `/api/contracts/${editingContract.id}` : "/api/contracts";
      const method = editingContract ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        setFormError(result.error || "操作失败");
        return;
      }

      setShowForm(false);
      fetchContracts();
    } catch {
      setFormError("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSearch() {
    setPage(1);
    fetchContracts();
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">合同管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理所有学生合同，支持创建、审批、签署和终止
          </p>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          新增合同
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索合同编号、学生姓名..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
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
            <FileText className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无合同数据</p>
            <button
              onClick={openNewForm}
              className="mt-3 text-blue-600 text-sm hover:underline"
            >
              创建第一个合同
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">合同编号</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学生</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">合同金额</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">签署日期</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">订单数</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">更新时间</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.list.map((contract) => (
                    <tr
                      key={contract.id}
                      className="hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => router.push(`/contracts/${contract.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-sm font-mono">
                          {contract.contractNo}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {contract.student.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{contract.student.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm text-gray-900">
                          {CURRENCY_MAP[contract.currency] || contract.currency}
                          {parseFloat(contract.totalAmount).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {contract.signDate
                          ? new Date(contract.signDate).toLocaleDateString("zh-CN")
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_MAP[contract.status]?.color || "bg-gray-100 text-gray-800"}`}>
                          {STATUS_MAP[contract.status]?.label || contract.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{contract._count.orders}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(contract.updatedAt).toLocaleDateString("zh-CN")}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openEditForm(contract)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="编辑"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingContract ? "编辑合同" : "新增合同"}
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

              {/* 学生选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  关联学生 <span className="text-red-500">*</span>
                </label>
                {selectedStudent ? (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">{selectedStudent.name}</span>
                    <button
                      type="button"
                      onClick={() => { setSelectedStudent(null); setStudentSearch(""); setFormData((d) => ({ ...d, studentId: "" })); }}
                      className="ml-auto text-xs text-blue-600 hover:underline"
                    >
                      更换
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      onFocus={() => { if (studentResults.length === 0) { loadRecentStudents(); }; }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="点击选择或搜索学生..."
                    />
                    {studentResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {studentResults.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => selectStudent(s)}
                            className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm"
                          >
                            <div className="font-medium text-gray-900">{s.name}</div>
                            <div className="text-xs text-gray-500">{s.phone}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    合同编号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contractNo}
                    onChange={(e) => setFormData((d) => ({ ...d, contractNo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                    placeholder="如：HT-2026-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">签署日期</label>
                  <input
                    type="date"
                    value={formData.signDate}
                    onChange={(e) => setFormData((d) => ({ ...d, signDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    合同金额 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData((d) => ({ ...d, totalAmount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="金额"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">币种</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData((d) => ({ ...d, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.entries(CURRENCY_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{k} ({v})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((d) => ({ ...d, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
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
                  {submitting ? "保存中..." : editingContract ? "保存修改" : "确认新增"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
