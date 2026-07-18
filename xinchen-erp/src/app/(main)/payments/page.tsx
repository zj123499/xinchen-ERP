"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, MoreHorizontal, ChevronLeft, ChevronRight,
  RefreshCw, User, DollarSign, FileText, Calendar, Filter,
} from "lucide-react";

interface PaymentItem {
  id: number;
  paymentNo: string;
  paymentType: string;
  amount: string;
  currency: string;
  exchangeRate?: string;
  baseAmount?: string;
  method: string;
  paidAt: string;
  payerName?: string;
  remark?: string;
  createdAt: string;
  student: { id: number; name: string; phone: string };
  order: { id: number; orderNo: string; productName: string } | null;
}

interface StudentOption {
  id: number;
  name: string;
  phone: string;
}

interface OrderOption {
  id: number;
  orderNo: string;
  productName: string;
}

interface PaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: PaymentItem[];
}

const PAYMENT_TYPE_MAP: Record<string, string> = {
  CLIENT_FEE: "客户费用",
  SCHOOL_COMMISSION: "学校佣金",
  PARTNER_FEE: "合作方费用",
  OTHER_INCOME: "其他收入",
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  CASH: "现金",
  BANK_TRANSFER: "银行转账",
  WECHAT: "微信",
  ALIPAY: "支付宝",
  CREDIT_CARD: "信用卡",
};

const CURRENCY_MAP: Record<string, string> = {
  CNY: "¥", USD: "$", GBP: "£", AUD: "A$", CAD: "C$", SGD: "S$", MYR: "RM",
};

export default function PaymentsPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("");
  const pageSize = 20;

  // 创建/编辑弹窗
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    studentId: "", orderId: "", paymentType: "CLIENT_FEE",
    amount: "", currency: "CNY", exchangeRate: "1",
    method: "BANK_TRANSFER", paidAt: new Date().toISOString().split("T")[0],
    payerName: "", remark: "",
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // 学生和订单搜索
  const [studentKeyword, setStudentKeyword] = useState("");
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string } | null>(null);
  const [studentSearchTimer, setStudentSearchTimer] = useState<NodeJS.Timeout | null>(null);

  // 详情弹窗
  const [showDetail, setShowDetail] = useState(false);
  const [detailPayment, setDetailPayment] = useState<PaymentItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchKeyword) params.set("keyword", searchKeyword);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (paymentTypeFilter) params.set("paymentType", paymentTypeFilter);
      const res = await fetch(`/api/payments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("获取收款记录失败", err);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, page, paymentTypeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleSearch() { setPage(1); setSearchKeyword(keyword); }

  function openCreate() {
    setEditId(null);
    setForm({
      studentId: "", orderId: "", paymentType: "CLIENT_FEE",
      amount: "", currency: "CNY", exchangeRate: "1",
      method: "BANK_TRANSFER", paidAt: new Date().toISOString().split("T")[0],
      payerName: "", remark: "",
    });
    setSelectedStudent(null);
    setFormError("");
    setShowModal(true);
  }

  async function openEdit(payment: PaymentItem) {
    setEditId(payment.id);
    setForm({
      studentId: String(payment.student.id),
      orderId: payment.order ? String(payment.order.id) : "",
      paymentType: payment.paymentType,
      amount: String(payment.amount),
      currency: payment.currency,
      exchangeRate: payment.exchangeRate ? String(payment.exchangeRate) : "1",
      method: payment.method,
      paidAt: payment.paidAt ? new Date(payment.paidAt).toISOString().split("T")[0] : "",
      payerName: payment.payerName || "",
      remark: payment.remark || "",
    });
    setSelectedStudent({ id: payment.student.id, name: payment.student.name });
    setFormError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentId) { setFormError("请选择学生"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setFormError("请输入有效金额"); return; }
    if (!form.paidAt) { setFormError("请选择收款日期"); return; }
    setSaving(true);
    setFormError("");
    try {
      const url = editId ? `/api/payments/${editId}` : "/api/payments";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "保存失败");
        return;
      }
      setShowModal(false);
      fetchData();
    } catch {
      setFormError("网络错误");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("确定要删除这条收款记录吗？")) return;
    try {
      await fetch(`/api/payments/${id}`, { method: "DELETE" });
      fetchData();
    } catch {
      alert("删除失败");
    }
  }

  async function openDetail(payment: PaymentItem) {
    try {
      const res = await fetch(`/api/payments/${payment.id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setDetailPayment(data);
      setShowDetail(true);
    } catch {
      alert("获取详情失败");
    }
  }

  function searchStudents(keyword: string) {
    setStudentKeyword(keyword);
    if (studentSearchTimer) clearTimeout(studentSearchTimer);
    const timer = setTimeout(async () => {
      if (!keyword.trim()) { setStudentOptions([]); return; }
      try {
        const res = await fetch(`/api/students?keyword=${encodeURIComponent(keyword)}&pageSize=10`);
        if (res.ok) {
          const data = await res.json();
          setStudentOptions(data.list || []);
        }
      } catch {}
    }, 300);
    setStudentSearchTimer(timer);
  }

  function selectStudent(student: StudentOption) {
    setForm((f) => ({ ...f, studentId: String(student.id) }));
    setSelectedStudent({ id: student.id, name: student.name });
    setStudentKeyword("");
    setStudentOptions([]);
  }

  const formatAmount = (amount: string, currency: string) => {
    const symbol = CURRENCY_MAP[currency] || "";
    return `${symbol}${Number(amount).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">收款管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理所有收款记录</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">
          <Plus className="w-4 h-4" /> 新增收款
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              placeholder="搜索收款编号、付款人、学生姓名/手机号..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <select value={paymentTypeFilter} onChange={(e) => { setPaymentTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部类型</option>
            {Object.entries(PAYMENT_TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={handleSearch} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">搜索</button>
          <button onClick={() => { setKeyword(""); setSearchKeyword(""); setPaymentTypeFilter(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : !data || data.list.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">暂无收款记录</p>
            <button onClick={openCreate} className="mt-3 text-sm text-blue-600 hover:text-blue-700">新增收款</button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">收款编号</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">学生</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">类型</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">金额</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">方式</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">收款日期</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">关联订单</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((pmt) => (
                  <tr key={pmt.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <button onClick={() => openDetail(pmt)} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                        {pmt.paymentNo}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{pmt.student.name}</div>
                          <div className="text-xs text-gray-400">{pmt.student.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{PAYMENT_TYPE_MAP[pmt.paymentType] || pmt.paymentType}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-gray-900">{formatAmount(pmt.amount, pmt.currency)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{PAYMENT_METHOD_MAP[pmt.method] || pmt.method}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {new Date(pmt.paidAt).toLocaleDateString("zh-CN")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {pmt.order ? (
                        <button onClick={() => router.push(`/orders/${pmt.order!.id}`)} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> {pmt.order.orderNo}
                        </button>
                      ) : <span className="text-sm text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(pmt)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="编辑">✎</button>
                        <button onClick={() => handleDelete(pmt.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="删除">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">共 {data.total} 条，第 {data.page}/{data.totalPages} 页</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-1.5 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => {
                  let pn: number;
                  if (data.totalPages <= 5) pn = i + 1;
                  else if (page <= 3) pn = i + 1;
                  else if (page >= data.totalPages - 2) pn = data.totalPages - 4 + i;
                  else pn = page - 2 + i;
                  return <button key={pn} onClick={() => setPage(pn)} className={`w-8 h-8 text-sm rounded transition ${pn === page ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}>{pn}</button>;
                })}
                <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                  className="p-1.5 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 创建/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editId ? "编辑收款" : "新增收款"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学生 <span className="text-red-500">*</span></label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm font-medium text-blue-700">{selectedStudent.name}</span>
                    <button type="button" onClick={() => { setSelectedStudent(null); setForm((f) => ({ ...f, studentId: "" })); }}
                      className="text-xs text-blue-500 hover:text-blue-700">清除</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input type="text" value={studentKeyword} onChange={(e) => searchStudents(e.target.value)}
                      placeholder="搜索学生姓名或手机号..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    {studentOptions.length > 0 && (
                      <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {studentOptions.map((s) => (
                          <button key={s.id} type="button" onClick={() => selectStudent(s)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between">
                            <span className="font-medium">{s.name}</span>
                            <span className="text-gray-400 text-xs">{s.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">收款类型</label>
                  <select value={form.paymentType} onChange={(e) => setForm((f) => ({ ...f, paymentType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {Object.entries(PAYMENT_TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">金额 <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">币种</label>
                  <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {Object.entries(CURRENCY_MAP).map(([k, v]) => <option key={k} value={k}>{k} ({v})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">汇率</label>
                  <input type="number" step="0.000001" value={form.exchangeRate} onChange={(e) => setForm((f) => ({ ...f, exchangeRate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">收款方式 <span className="text-red-500">*</span></label>
                  <select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {Object.entries(PAYMENT_METHOD_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">收款日期 <span className="text-red-500">*</span></label>
                  <input type="date" value={form.paidAt} onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">付款人</label>
                <input type="text" value={form.payerName} onChange={(e) => setForm((f) => ({ ...f, payerName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="付款人姓名" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">关联订单</label>
                <input type="text" value={form.orderId} onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="输入订单ID（可选）" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea value={form.remark} onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="备注信息" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button type="submit" disabled={saving} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {showDetail && detailPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">收款详情</h2>
              <button onClick={() => setShowDetail(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="text-xs text-gray-400">收款编号</div>
                <div className="text-sm font-mono font-medium text-gray-900">{detailPayment.paymentNo}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-xs text-gray-400 mb-1">学生</div><div className="text-sm font-medium text-gray-900">{detailPayment.student.name}</div></div>
                <div><div className="text-xs text-gray-400 mb-1">电话</div><div className="text-sm text-gray-700">{detailPayment.student.phone}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-xs text-gray-400 mb-1">收款类型</div><div className="text-sm text-gray-700">{PAYMENT_TYPE_MAP[detailPayment.paymentType] || detailPayment.paymentType}</div></div>
                <div><div className="text-xs text-gray-400 mb-1">金额</div><div className="text-sm font-semibold text-gray-900">{formatAmount(detailPayment.amount, detailPayment.currency)}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-xs text-gray-400 mb-1">收款方式</div><div className="text-sm text-gray-700">{PAYMENT_METHOD_MAP[detailPayment.method] || detailPayment.method}</div></div>
                <div><div className="text-xs text-gray-400 mb-1">收款日期</div><div className="text-sm text-gray-700">{new Date(detailPayment.paidAt).toLocaleDateString("zh-CN")}</div></div>
              </div>
              {detailPayment.exchangeRate && Number(detailPayment.exchangeRate) !== 1 && (
                <div className="grid grid-cols-2 gap-4">
                  <div><div className="text-xs text-gray-400 mb-1">汇率</div><div className="text-sm text-gray-700">{String(detailPayment.exchangeRate)}</div></div>
                  <div><div className="text-xs text-gray-400 mb-1">本位币金额</div><div className="text-sm font-medium text-gray-900">{formatAmount(String(detailPayment.baseAmount || detailPayment.amount), "CNY")}</div></div>
                </div>
              )}
              {detailPayment.payerName && (
                <div><div className="text-xs text-gray-400 mb-1">付款人</div><div className="text-sm text-gray-700">{detailPayment.payerName}</div></div>
              )}
              {detailPayment.order && (
                <div><div className="text-xs text-gray-400 mb-1">关联订单</div>
                  <button onClick={() => { setShowDetail(false); router.push(`/orders/${detailPayment.order!.id}`); }}
                    className="text-sm text-blue-600 hover:text-blue-800">{detailPayment.order.orderNo} - {detailPayment.order.productName}</button>
                </div>
              )}
              {detailPayment.remark && (
                <div><div className="text-xs text-gray-400 mb-1">备注</div><div className="text-sm text-gray-700 whitespace-pre-wrap">{detailPayment.remark}</div></div>
              )}
              <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                创建时间: {new Date(detailPayment.createdAt).toLocaleString("zh-CN")}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
