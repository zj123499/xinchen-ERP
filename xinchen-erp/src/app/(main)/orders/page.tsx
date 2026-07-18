"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, ClipboardCheck, MoreHorizontal, ChevronLeft, ChevronRight,
  RefreshCw, User, FileText, DollarSign, Calendar,
} from "lucide-react";

interface OrderItem {
  id: number;
  orderNo: string;
  productName: string;
  amount: string;
  currency: string;
  status: string;
  startDate?: string;
  endDate?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  student: { id: number; name: string; phone: string };
  contract: { id: number; contractNo: string };
  assignedTo?: { id: number; realName: string } | null;
  _count: { payments: number; applications: number };
}

interface PaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: OrderItem[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待处理", color: "bg-yellow-100 text-yellow-800" },
  ACTIVE: { label: "进行中", color: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "已完成", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "已取消", color: "bg-red-100 text-red-800" },
  REFUNDED: { label: "已退款", color: "bg-gray-100 text-gray-600" },
};

const CURRENCY_MAP: Record<string, string> = {
  CNY: "¥", USD: "$", GBP: "£", AUD: "A$", CAD: "C$", SGD: "S$", MYR: "RM",
};

export default function OrdersPage() {
  const router = useRouter();
  const initialContractId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("contractId") : null;
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // 新增/编辑弹窗
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [formData, setFormData] = useState({
    studentId: "",
    contractId: "",
    orderNo: "",
    productName: "",
    amount: "",
    currency: "CNY",
    status: "PENDING",
    startDate: "",
    endDate: "",
    remark: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 学生搜索
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<{ id: number; name: string; phone: string }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string } | null>(null);

  // 合同搜索（选择学生后加载）
  const [contracts, setContracts] = useState<{ id: number; contractNo: string }[]>([]);
  const [selectedContract, setSelectedContract] = useState<{ id: number; contractNo: string } | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      if (statusFilter) params.set("status", statusFilter);
      if (initialContractId) params.set("contractId", initialContractId);

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("获取订单列表失败:", err);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 学生搜索防抖
  useEffect(() => {
    if (studentSearch.length < 2) {
      setStudentResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/students?keyword=${encodeURIComponent(studentSearch)}&pageSize=10`);
        const result = await res.json();
        setStudentResults(result.list || []);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  // 选择学生后加载其合同列表
  useEffect(() => {
    if (!formData.studentId) return;
    (async () => {
      try {
        const res = await fetch(`/api/contracts?studentId=${formData.studentId}&pageSize=50`);
        const result = await res.json();
        setContracts(result.list || []);
      } catch {}
    })();
  }, [formData.studentId]);

  function openNewForm() {
    setEditingOrder(null);
    setSelectedStudent(null);
    setSelectedContract(null);
    setStudentSearch("");
    setContracts([]);
    setFormData({
      studentId: "",
      contractId: "",
      orderNo: "",
      productName: "",
      amount: "",
      currency: "CNY",
      status: "PENDING",
      startDate: "",
      endDate: "",
      remark: "",
    });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(order: OrderItem) {
    setEditingOrder(order);
    setSelectedStudent({ id: order.student.id, name: order.student.name });
    setStudentSearch(order.student.name);
    setSelectedContract({ id: order.contract.id, contractNo: order.contract.contractNo });
    setFormData({
      studentId: String(order.student.id),
      contractId: String(order.contract.id),
      orderNo: order.orderNo,
      productName: order.productName,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      startDate: order.startDate ? new Date(order.startDate).toISOString().split("T")[0] : "",
      endDate: order.endDate ? new Date(order.endDate).toISOString().split("T")[0] : "",
      remark: order.remark || "",
    });
    setFormError("");
    setShowForm(true);
  }

  function selectStudent(s: { id: number; name: string; phone: string }) {
    setSelectedStudent({ id: s.id, name: s.name });
    setStudentSearch(s.name);
    setStudentResults([]);
    setSelectedContract(null);
    setFormData((d) => ({ ...d, studentId: String(s.id), contractId: "" }));
  }

  function selectContract(c: { id: number; contractNo: string }) {
    setSelectedContract({ id: c.id, contractNo: c.contractNo });
    setFormData((d) => ({ ...d, contractId: String(c.id) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      };

      const url = editingOrder ? `/api/orders/${editingOrder.id}` : "/api/orders";
      const method = editingOrder ? "PUT" : "POST";

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
      fetchOrders();
    } catch {
      setFormError("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSearch() {
    setPage(1);
    fetchOrders();
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理所有服务订单，关联合同与学生，跟踪服务周期和状态
          </p>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          新增订单
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索订单编号、产品名称、学生姓名..."
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
            <ClipboardCheck className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无订单数据</p>
            <button
              onClick={openNewForm}
              className="mt-3 text-blue-600 text-sm hover:underline"
            >
              创建第一个订单
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">订单编号</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">产品名称</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学生</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">关联合同</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">金额</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">负责人</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">服务周期</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.list.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => router.push(`/orders/${order.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-blue-600 font-mono">{order.orderNo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900 font-medium">{order.productName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-700">{order.student.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500 font-mono">{order.contract.contractNo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm text-gray-900">
                          {CURRENCY_MAP[order.currency] || order.currency}
                          {parseFloat(order.amount).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_MAP[order.status]?.color || "bg-gray-100 text-gray-800"}`}>
                          {STATUS_MAP[order.status]?.label || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {order.assignedTo?.realName || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-500">
                          {order.startDate
                            ? `${new Date(order.startDate).toLocaleDateString("zh-CN")} ~ ${order.endDate ? new Date(order.endDate).toLocaleDateString("zh-CN") : "至今"}`
                            : "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openEditForm(order)}
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
                {editingOrder ? "编辑订单" : "新增订单"}
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
                      onClick={() => { setSelectedStudent(null); setStudentSearch(""); setSelectedContract(null); setFormData((d) => ({ ...d, studentId: "", contractId: "" })); }}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="输入学生姓名搜索..."
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

              {/* 合同选择 */}
              {selectedStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    关联合同 <span className="text-red-500">*</span>
                  </label>
                  {selectedContract ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900 font-mono">{selectedContract.contractNo}</span>
                      <button
                        type="button"
                        onClick={() => { setSelectedContract(null); setFormData((d) => ({ ...d, contractId: "" })); }}
                        className="ml-auto text-xs text-green-600 hover:underline"
                      >
                        更换
                      </button>
                    </div>
                  ) : contracts.length > 0 ? (
                    <select
                      value={formData.contractId}
                      onChange={(e) => {
                        const c = contracts.find((x) => x.id === parseInt(e.target.value));
                        if (c) selectContract(c);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">请选择合同</option>
                      {contracts.map((c) => (
                        <option key={c.id} value={c.id}>{c.contractNo}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-gray-400 p-3 bg-gray-50 rounded-lg">该学生暂无合同，请先在合同管理中创建合同</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    订单编号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.orderNo}
                    onChange={(e) => setFormData((d) => ({ ...d, orderNo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    placeholder="如：DD-2026-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    产品名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.productName}
                    onChange={(e) => setFormData((d) => ({ ...d, productName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="如：硕士申请全程服务"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    金额 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData((d) => ({ ...d, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">服务开始日期</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData((d) => ({ ...d, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">服务结束日期</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData((d) => ({ ...d, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData((d) => ({ ...d, remark: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
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
                  {submitting ? "保存中..." : editingOrder ? "保存修改" : "确认新增"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
