"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ClipboardCheck, User, FileText, DollarSign, Calendar,
  RefreshCw, Edit3, CreditCard, Globe, Clock,
} from "lucide-react";

interface PaymentItem {
  id: number;
  amount: string;
  currency: string;
  paymentMethod: string;
  paymentDate: string;
  status: string;
  remark?: string;
}

interface ApplicationItem {
  id: number;
  institutionName: string;
  majorName: string;
  status: string;
  createdAt: string;
  offers?: { id: number; institutionName: string; majorName: string }[];
}

interface OrderDetail {
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
  student: { id: number; name: string; phone: string; wechat?: string };
  contract: { id: number; contractNo: string; totalAmount: string; status: string };
  assignedTo?: { id: number; realName: string } | null;
  payments: PaymentItem[];
  applications: ApplicationItem[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待处理", color: "bg-yellow-100 text-yellow-800" },
  ACTIVE: { label: "进行中", color: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "已完成", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "已取消", color: "bg-red-100 text-red-800" },
  REFUNDED: { label: "已退款", color: "bg-gray-100 text-gray-600" },
};

const CONTRACT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "草稿", color: "bg-gray-100 text-gray-800" },
  PENDING: { label: "待审批", color: "bg-yellow-100 text-yellow-800" },
  APPROVED: { label: "已审批", color: "bg-blue-100 text-blue-800" },
  SIGNED: { label: "已签署", color: "bg-green-100 text-green-800" },
  TERMINATED: { label: "已终止", color: "bg-red-100 text-red-800" },
  EXPIRED: { label: "已过期", color: "bg-gray-100 text-gray-600" },
};

const APPLICATION_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PREPARING: { label: "准备中", color: "bg-gray-100 text-gray-800" },
  SUBMITTED: { label: "已提交", color: "bg-blue-100 text-blue-800" },
  REVIEWING: { label: "审核中", color: "bg-yellow-100 text-yellow-800" },
  OFFER: { label: "已获Offer", color: "bg-green-100 text-green-800" },
  REJECTED: { label: "已拒", color: "bg-red-100 text-red-800" },
  DEFERRED: { label: "延期", color: "bg-purple-100 text-purple-800" },
  ACCEPTED: { label: "已接受", color: "bg-green-100 text-green-800" },
};

const CURRENCY_MAP: Record<string, string> = {
  CNY: "¥", USD: "$", GBP: "£", AUD: "A$", CAD: "C$", SGD: "S$", MYR: "RM",
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  BANK_TRANSFER: "银行转账", WECHAT: "微信支付", ALIPAY: "支付宝",
  CASH: "现金", CREDIT_CARD: "信用卡", OTHER: "其他",
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待收款", color: "bg-yellow-100 text-yellow-800" },
  COMPLETED: { label: "已收款", color: "bg-green-100 text-green-800" },
  REFUNDED: { label: "已退款", color: "bg-red-100 text-red-800" },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 编辑弹窗
  const [showEditForm, setShowEditForm] = useState(false);
  const [editData, setEditData] = useState({
    status: "",
    orderNo: "",
    productName: "",
    amount: "",
    currency: "",
    startDate: "",
    endDate: "",
    remark: "",
  });
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${params.id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setOrder(data);
    } catch (err) {
      console.error("获取订单详情失败:", err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  function openEditForm() {
    if (!order) return;
    setEditData({
      status: order.status,
      orderNo: order.orderNo,
      productName: order.productName,
      amount: order.amount,
      currency: order.currency,
      startDate: order.startDate ? new Date(order.startDate).toISOString().split("T")[0] : "",
      endDate: order.endDate ? new Date(order.endDate).toISOString().split("T")[0] : "",
      remark: order.remark || "",
    });
    setEditError("");
    setShowEditForm(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditError("");
    setSaving(true);
    try {
      const payload = {
        ...editData,
        amount: parseFloat(editData.amount),
        startDate: editData.startDate || null,
        endDate: editData.endDate || null,
      };
      const res = await fetch(`/api/orders/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        setEditError(result.error || "更新失败");
        return;
      }
      setShowEditForm(false);
      fetchOrder();
    } catch {
      setEditError("网络错误");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-20 text-gray-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        加载中...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-20 text-gray-400">
        <ClipboardCheck className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-sm">订单不存在</p>
        <button onClick={() => router.push("/orders")} className="mt-3 text-blue-600 text-sm hover:underline">
          返回订单列表
        </button>
      </div>
    );
  }

  const totalPaid = order.payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  return (
    <div className="p-6">
      {/* 面包屑导航 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/orders")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          返回订单列表
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium font-mono">{order.orderNo}</span>
      </div>

      {/* 订单头部 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{order.productName}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-mono text-blue-600">{order.orderNo}</span>
                <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_MAP[order.status]?.color || "bg-gray-100"}`}>
                  {STATUS_MAP[order.status]?.label || order.status}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={openEditForm}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            <Edit3 className="w-4 h-4" />
            编辑
          </button>
        </div>

        {/* 基本信息网格 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-100">
          <div>
            <div className="text-xs text-gray-400 mb-1">关联学生</div>
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-gray-400" />
              <button
                onClick={() => router.push(`/students/${order.student.id}`)}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                {order.student.name}
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{order.student.phone}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">关联合同</div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-gray-400" />
              <button
                onClick={() => router.push(`/contracts/${order.contract.id}`)}
                className="text-sm font-mono text-blue-600 hover:underline"
              >
                {order.contract.contractNo}
              </button>
            </div>
            <span className={`inline-flex text-xs px-1.5 py-0.5 rounded ${CONTRACT_STATUS_MAP[order.contract.status]?.color}`}>
              {CONTRACT_STATUS_MAP[order.contract.status]?.label}
            </span>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">订单金额</div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-lg font-bold text-gray-900">
                {CURRENCY_MAP[order.currency] || order.currency}
                {parseFloat(order.amount).toLocaleString()}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">负责人</div>
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">{order.assignedTo?.realName || "-"}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">服务周期</div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">
                {order.startDate
                  ? `${new Date(order.startDate).toLocaleDateString("zh-CN")} ~ ${order.endDate ? new Date(order.endDate).toLocaleDateString("zh-CN") : "至今"}`
                  : "未设置"}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">已收款</div>
            <div className="flex items-center gap-1">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <span className="text-lg font-bold text-green-600">
                {CURRENCY_MAP[order.currency] || order.currency}
                {totalPaid.toLocaleString()}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">创建时间</div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">
                {new Date(order.createdAt).toLocaleString("zh-CN")}
              </span>
            </div>
          </div>
        </div>

        {order.remark && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-400 mb-1">备注</div>
            <p className="text-sm text-gray-700">{order.remark}</p>
          </div>
        )}
      </div>

      {/* 收款记录 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            收款记录 ({order.payments.length})
          </h2>
        </div>
        {order.payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <CreditCard className="w-10 h-10 mb-2 text-gray-300" />
            <p className="text-sm">暂无收款记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">收款日期</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">金额</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">支付方式</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {payment.paymentDate
                        ? new Date(payment.paymentDate).toLocaleDateString("zh-CN")
                        : "-"}
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {CURRENCY_MAP[payment.currency] || payment.currency}
                        {parseFloat(payment.amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {PAYMENT_METHOD_MAP[payment.paymentMethod] || payment.paymentMethod}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${PAYMENT_STATUS_MAP[payment.status]?.color || "bg-gray-100 text-gray-800"}`}>
                        {PAYMENT_STATUS_MAP[payment.status]?.label || payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                      {payment.remark || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 关联申请 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            关联申请 ({order.applications.length})
          </h2>
        </div>
        {order.applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Globe className="w-10 h-10 mb-2 text-gray-300" />
            <p className="text-sm">暂无申请记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">目标院校</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">目标专业</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Offer</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">创建时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-sm text-gray-900 font-medium">
                      {app.institutionName}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {app.majorName}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${APPLICATION_STATUS_MAP[app.status]?.color || "bg-gray-100 text-gray-800"}`}>
                        {APPLICATION_STATUS_MAP[app.status]?.label || app.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {app.offers && app.offers.length > 0 ? (
                        <span className="text-green-600 font-medium">
                          {app.offers[0].institutionName} - {app.offers[0].majorName}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {new Date(app.createdAt).toLocaleDateString("zh-CN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {showEditForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">编辑订单</h2>
              <button onClick={() => setShowEditForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">✕</button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{editError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">订单编号</label>
                <input
                  type="text"
                  value={editData.orderNo}
                  onChange={(e) => setEditData((d) => ({ ...d, orderNo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">产品名称</label>
                <input
                  type="text"
                  value={editData.productName}
                  onChange={(e) => setEditData((d) => ({ ...d, productName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData((d) => ({ ...d, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">金额</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.amount}
                    onChange={(e) => setEditData((d) => ({ ...d, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">币种</label>
                  <select
                    value={editData.currency}
                    onChange={(e) => setEditData((d) => ({ ...d, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.entries(CURRENCY_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">服务开始</label>
                  <input
                    type="date"
                    value={editData.startDate}
                    onChange={(e) => setEditData((d) => ({ ...d, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">服务结束</label>
                  <input
                    type="date"
                    value={editData.endDate}
                    onChange={(e) => setEditData((d) => ({ ...d, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={editData.remark}
                  onChange={(e) => setEditData((d) => ({ ...d, remark: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEditForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={saving} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                  {saving ? "保存中..." : "保存修改"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
