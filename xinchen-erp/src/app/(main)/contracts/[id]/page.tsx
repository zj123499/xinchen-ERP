"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, User, Calendar, DollarSign, Edit3,
  RefreshCw, Plus, TrendingUp, Building2, MessageSquare,
} from "lucide-react";

interface ContractDetail {
  id: number;
  contractNo: string;
  signDate: string;
  totalAmount: string;
  currency: string;
  status: string;
  content?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  student: { id: number; name: string; phone: string; wechat?: string; currentStatus: string };
  businessLine?: { id: number; name: string } | null;
  orders: {
    id: number;
    orderNo: string;
    productName: string;
    amount: string;
    currency: string;
    status: string;
    startDate?: string;
    endDate?: string;
    createdAt: string;
    assignedTo?: { id: number; realName: string } | null;
  }[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "草稿", color: "bg-gray-100 text-gray-800" },
  PENDING: { label: "待审批", color: "bg-yellow-100 text-yellow-800" },
  APPROVED: { label: "已审批", color: "bg-blue-100 text-blue-800" },
  SIGNED: { label: "已签署", color: "bg-green-100 text-green-800" },
  TERMINATED: { label: "已终止", color: "bg-red-100 text-red-800" },
  EXPIRED: { label: "已过期", color: "bg-gray-100 text-gray-600" },
};

const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待处理", color: "bg-yellow-100 text-yellow-800" },
  ACTIVE: { label: "进行中", color: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "已完成", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "已取消", color: "bg-red-100 text-red-800" },
  REFUNDED: { label: "已退款", color: "bg-gray-100 text-gray-600" },
};

const CURRENCY_MAP: Record<string, string> = {
  CNY: "¥", USD: "$", GBP: "£", AUD: "A$", CAD: "C$", SGD: "S$", MYR: "RM",
};

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 编辑弹窗
  const [showEditForm, setShowEditForm] = useState(false);
  const [editData, setEditData] = useState({
    status: "",
    contractNo: "",
    signDate: "",
    totalAmount: "",
    currency: "",
    remark: "",
  });
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchContract = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${params.id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setContract(data);
    } catch (err) {
      console.error("获取合同详情失败:", err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  function openEditForm() {
    if (!contract) return;
    setEditData({
      status: contract.status,
      contractNo: contract.contractNo,
      signDate: contract.signDate ? new Date(contract.signDate).toISOString().split("T")[0] : "",
      totalAmount: contract.totalAmount,
      currency: contract.currency,
      remark: contract.remark || "",
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
        totalAmount: parseFloat(editData.totalAmount),
      };
      const res = await fetch(`/api/contracts/${params.id}`, {
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
      fetchContract();
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

  if (!contract) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-20 text-gray-400">
        <FileText className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-sm">合同不存在</p>
        <button onClick={() => router.push("/contracts")} className="mt-3 text-blue-600 text-sm hover:underline">
          返回合同列表
        </button>
      </div>
    );
  }

  const totalOrderAmount = contract.orders.reduce((sum, o) => sum + parseFloat(o.amount), 0);

  return (
    <div className="p-6">
      {/* 面包屑导航 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/contracts")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          返回合同列表
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700 font-medium">{contract.contractNo}</span>
      </div>

      {/* 合同头部信息 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-mono">{contract.contractNo}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_MAP[contract.status]?.color || "bg-gray-100"}`}>
                  {STATUS_MAP[contract.status]?.label || contract.status}
                </span>
                {contract.businessLine && (
                  <span className="text-sm text-gray-500">
                    <Building2 className="w-3.5 h-3.5 inline mr-1" />
                    {contract.businessLine.name}
                  </span>
                )}
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
                onClick={() => router.push(`/students/${contract.student.id}`)}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                {contract.student.name}
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{contract.student.phone}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">合同金额</div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-lg font-bold text-gray-900">
                {CURRENCY_MAP[contract.currency] || contract.currency}
                {parseFloat(contract.totalAmount).toLocaleString()}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">签署日期</div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">
                {contract.signDate ? new Date(contract.signDate).toLocaleDateString("zh-CN") : "-"}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">订单总额</div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-lg font-bold text-green-600">
                {CURRENCY_MAP[contract.currency] || contract.currency}
                {totalOrderAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {contract.remark && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-400 mb-1">备注</div>
            <p className="text-sm text-gray-700">{contract.remark}</p>
          </div>
        )}
      </div>

      {/* 订单列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">关联订单 ({contract.orders.length})</h2>
          <button
            onClick={() => router.push(`/orders?contractId=${contract.id}`)}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
          >
            <Plus className="w-4 h-4" />
            新增订单
          </button>
        </div>

        {contract.orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <FileText className="w-10 h-10 mb-2 text-gray-300" />
            <p className="text-sm">暂无订单</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">订单编号</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">产品名称</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">金额</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">负责人</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">服务周期</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">创建时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contract.orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <td className="px-6 py-3">
                      <span className="text-sm font-medium text-blue-600 font-mono">{order.orderNo}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">{order.productName}</td>
                    <td className="px-6 py-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {CURRENCY_MAP[order.currency] || order.currency}
                        {parseFloat(order.amount).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${ORDER_STATUS_MAP[order.status]?.color || "bg-gray-100 text-gray-800"}`}>
                        {ORDER_STATUS_MAP[order.status]?.label || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {order.assignedTo?.realName || "-"}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {order.startDate
                        ? `${new Date(order.startDate).toLocaleDateString("zh-CN")} ~ ${order.endDate ? new Date(order.endDate).toLocaleDateString("zh-CN") : "至今"}`
                        : "-"}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("zh-CN")}
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
              <h2 className="text-lg font-semibold text-gray-900">编辑合同</h2>
              <button onClick={() => setShowEditForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">✕</button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{editError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">合同编号</label>
                <input
                  type="text"
                  value={editData.contractNo}
                  onChange={(e) => setEditData((d) => ({ ...d, contractNo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">签署日期</label>
                  <input
                    type="date"
                    value={editData.signDate}
                    onChange={(e) => setEditData((d) => ({ ...d, signDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">金额</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.totalAmount}
                    onChange={(e) => setEditData((d) => ({ ...d, totalAmount: e.target.value }))}
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
