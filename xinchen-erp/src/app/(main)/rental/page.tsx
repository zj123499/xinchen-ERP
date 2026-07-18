"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, ChevronLeft, ChevronRight, RefreshCw,
  Home, User, Phone, Calendar, Filter, Plus,
  Trash2, Edit3, MapPin, DollarSign,
} from "lucide-react";

interface RentalOrderItem {
  id: number;
  studentId: number;
  city: string;
  address: string | null;
  moveInDate: string;
  moveOutDate: string | null;
  monthlyRent: string;
  currency: string;
  status: string;
  createdAt: string;
  student: { id: number; name: string; phone: string };
}

interface PaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: RentalOrderItem[];
}

interface StudentOption {
  id: number;
  name: string;
  phone: string;
}

const STATUS_MAP: Record<string, string> = {
  active: "入住中",
  completed: "已退租",
  cancelled: "已取消",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

const CURRENCY_SYMBOL: Record<string, string> = {
  CNY: "¥",
  USD: "$",
  GBP: "£",
  EUR: "€",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
};

const CITIES = ["伦敦", "曼彻斯特", "伯明翰", "爱丁堡", "悉尼", "墨尔本", "多伦多", "温哥华", "纽约", "洛杉矶", "其他"];

export default function RentalPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const pageSize = 20;

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalOrderItem | null>(null);
  const [formData, setFormData] = useState({
    studentId: "", city: "", address: "", moveInDate: "", moveOutDate: "",
    monthlyRent: "", currency: "CNY", status: "active",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<RentalOrderItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchKeyword) params.set("keyword", searchKeyword);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/rental-orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch (err) {
      console.error("获取租房订单失败", err);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch("/api/students?pageSize=200").then(r => r.json()).then(d => {
      setStudents(d.list || []);
    }).catch(() => {});
  }, []);

  function openNewForm() {
    setEditingItem(null);
    setFormData({ studentId: "", city: "", address: "", moveInDate: "", moveOutDate: "", monthlyRent: "", currency: "CNY", status: "active" });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(item: RentalOrderItem) {
    setEditingItem(item);
    setFormData({
      studentId: String(item.studentId),
      city: item.city,
      address: item.address || "",
      moveInDate: item.moveInDate ? item.moveInDate.slice(0, 10) : "",
      moveOutDate: item.moveOutDate ? item.moveOutDate.slice(0, 10) : "",
      monthlyRent: String(item.monthlyRent),
      currency: item.currency,
      status: item.status,
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
        studentId: formData.studentId,
        city: formData.city,
        address: formData.address || undefined,
        moveInDate: formData.moveInDate,
        moveOutDate: formData.moveOutDate || undefined,
        monthlyRent: formData.monthlyRent,
        currency: formData.currency,
        status: formData.status,
      };
      const url = editingItem ? `/api/rental-orders/${editingItem.id}` : "/api/rental-orders";
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
      await fetch(`/api/rental-orders/${deleteConfirm.id}`, { method: "DELETE" });
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">租房管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理留学生租房订单，追踪入住和退租状态</p>
        </div>
        <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4" />新增租房
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="搜索学生姓名或地址..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="relative">
            <button onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition ${statusFilter ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
              <Filter className="w-4 h-4" /> 状态 {statusFilter && <span className="w-2 h-2 rounded-full bg-blue-500" />}
            </button>
            {showFilter && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-3 min-w-[160px]">
                <div className="text-xs font-medium text-gray-500 mb-2">租房状态</div>
                <div className="space-y-1">
                  <button onClick={() => { setStatusFilter(""); setPage(1); setShowFilter(false); }}
                    className={`w-full text-left px-2 py-1 text-sm rounded ${!statusFilter ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>全部</button>
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <button key={k} onClick={() => { setStatusFilter(k); setPage(1); setShowFilter(false); }}
                      className={`w-full text-left px-2 py-1 text-sm rounded ${statusFilter === k ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>{v}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={handleSearch} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">搜索</button>
          <button onClick={() => { setKeyword(""); setSearchKeyword(""); setStatusFilter(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : !data || data.list.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Home className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">暂无租房订单</p>
            <button onClick={openNewForm} className="mt-3 text-blue-600 text-sm hover:underline">添加第一条租房订单</button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">学生</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">城市</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">地址</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">入住日期</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">退租日期</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">月租金</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">状态</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-orange-600" /></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{order.student.name}</div>
                          <div className="text-xs text-gray-400 flex items-center gap-0.5"><Phone className="w-3 h-3" /> {order.student.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" /><span className="text-sm text-gray-700">{order.city}</span></div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 max-w-[200px] truncate block" title={order.address || ""}>{order.address || "-"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" /><span className="text-sm text-gray-700">{new Date(order.moveInDate).toLocaleDateString("zh-CN")}</span></div>
                    </td>
                    <td className="px-6 py-4">
                      {order.moveOutDate ? (
                        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-400" /><span className="text-sm text-gray-700">{new Date(order.moveOutDate).toLocaleDateString("zh-CN")}</span></div>
                      ) : <span className="text-sm text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-gray-400" /><span className="text-sm font-medium text-gray-900">{CURRENCY_SYMBOL[order.currency] || order.currency}{order.monthlyRent}</span></div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status] || "bg-gray-100 text-gray-600"}`}>{STATUS_MAP[order.status] || order.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditForm(order)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="编辑"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteConfirm(order)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="删除"><Trash2 className="w-4 h-4" /></button>
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
              <h2 className="text-lg font-semibold text-gray-900">{editingItem ? "编辑租房" : "新增租房"}</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">城市 <span className="text-red-500">*</span></label>
                <select required value={formData.city} onChange={(e) => setFormData(d => ({ ...d, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">请选择城市</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">详细地址</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData(d => ({ ...d, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="如: 123 Oxford Street, London" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">入住日期 <span className="text-red-500">*</span></label>
                  <input type="date" required value={formData.moveInDate} onChange={(e) => setFormData(d => ({ ...d, moveInDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">退租日期</label>
                  <input type="date" value={formData.moveOutDate} onChange={(e) => setFormData(d => ({ ...d, moveOutDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">月租金 <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" required value={formData.monthlyRent} onChange={(e) => setFormData(d => ({ ...d, monthlyRent: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">币种</label>
                  <select value={formData.currency} onChange={(e) => setFormData(d => ({ ...d, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {Object.entries(CURRENCY_SYMBOL).map(([k, v]) => <option key={k} value={k}>{v} {k}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select value={formData.status} onChange={(e) => setFormData(d => ({ ...d, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
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
              <p className="text-sm text-gray-700">确定要删除 {deleteConfirm.student.name} 在 {deleteConfirm.city} 的租房订单吗？</p>
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
