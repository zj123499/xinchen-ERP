"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Trash2, Edit2, RefreshCw } from "lucide-react";

interface ProductItem {
  id: number;
  name: string;
  price: number;
  commissionRate: number | null;
  status: string;
  businessLine: { id: number; name: string } | null;
  country: { id: number; name: string } | null;
  institution: { id: number; name: string } | null;
}
interface CountryItem { id: number; name: string; }
interface BusinessLineItem { id: number; name: string; }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "启用", color: "bg-green-100 text-green-800" },
  INACTIVE: { label: "停用", color: "bg-gray-100 text-gray-800" },
};

export default function ProductsPage() {
  const [data, setData] = useState<ProductItem[]>([]);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [businessLines, setBusinessLines] = useState<BusinessLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProductItem | null>(null);
  const [form, setForm] = useState({ name: "", businessLineId: "", countryId: "", price: "", commissionRate: "", status: "ACTIVE", remark: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ProductItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set("keyword", keyword);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/products?${params.toString()}`);
      const result = await res.json();
      setData(result.list || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [keyword, statusFilter]);

  useEffect(() => {
    fetchData();
    fetch("/api/countries").then((r) => r.json()).then((d) => setCountries(d.list || [])).catch(() => {});
    fetch("/api/business-lines").then((r) => r.json()).then((d) => setBusinessLines((d.list as BusinessLineItem[]) || [])).catch(() => {});
  }, [fetchData]);

  function openNew() {
    setEditing(null);
    setForm({ name: "", businessLineId: businessLines[0]?.id?.toString() || "", countryId: "", price: "", commissionRate: "", status: "ACTIVE", remark: "" });
    setFormError(""); setShowForm(true);
  }
  function openEdit(p: ProductItem) {
    setEditing(p);
    setForm({ name: p.name, businessLineId: p.businessLine?.id?.toString() || "", countryId: p.country?.id?.toString() || "", price: p.price.toString(), commissionRate: p.commissionRate?.toString() || "", status: p.status, remark: "" });
    setFormError(""); setShowForm(true);
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setFormError("");
    if (!form.name || !form.price) { setFormError("产品名称和价格为必填项"); setSubmitting(false); return; }
    try {
      const url = editing ? `/api/products/${editing.id}` : "/api/products";
      const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await res.json();
      if (!res.ok) { setFormError(result.error || "保存失败"); return; }
      setShowForm(false); fetchData();
    } catch { setFormError("网络错误"); } finally { setSubmitting(false); }
  }
  async function handleDelete() {
    if (!deleteConfirm) return;
    await fetch(`/api/products/${deleteConfirm.id}`, { method: "DELETE" });
    setDeleteConfirm(null); fetchData();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">产品管理</h1>
          <p className="text-sm text-gray-500 mt-1">产品/服务包：报价标准与提成率参照</p></div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> 新增产品</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索产品名称"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">全部状态</option><option value="ACTIVE">启用</option><option value="INACTIVE">停用</option></select>
          <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 rounded-lg text-sm"><RefreshCw className="w-4 h-4" /> 刷新</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
          : data.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><p className="text-sm">暂无产品数据</p>
            <button onClick={openNew} className="mt-3 text-blue-600 text-sm hover:underline">添加第一个产品</button></div>
            : <table className="w-full"><thead><tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">产品</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">业务线</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">国家</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">价格</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">提成率</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr></thead><tbody className="divide-y divide-gray-100">
              {data.map((p) => <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-gray-600">{p.businessLine?.name || "-"}</td>
                <td className="px-4 py-3 text-gray-600">{p.country?.name || "-"}</td>
                <td className="px-4 py-3 text-gray-700 font-medium">¥{p.price}</td>
                <td className="px-4 py-3 text-gray-600">{p.commissionRate != null ? `${p.commissionRate}%` : "-"}</td>
                <td className="px-4 py-3"><span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_LABELS[p.status]?.color || "bg-gray-100"}`}>{STATUS_LABELS[p.status]?.label || p.status}</span></td>
                <td className="px-4 py-3"><div className="flex items-center gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteConfirm(p)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>)}
            </tbody></table>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? "编辑产品" : "新增产品"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">产品名称 <span className="text-red-500">*</span></label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">业务线</label>
                  <select value={form.businessLineId} onChange={(e) => setForm({ ...form, businessLineId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">未分类</option>{businessLines.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">国家</label>
                  <select value={form.countryId} onChange={(e) => setForm({ ...form, countryId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">无</option>{countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">价格 <span className="text-red-500">*</span></label>
                  <input required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">提成率(%)</label>
                  <input value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="ACTIVE">启用</option><option value="INACTIVE">停用</option></select></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? "保存中..." : "保存"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-xl"><h2 className="text-lg font-semibold text-red-800">确认删除</h2></div>
            <div className="p-6"><p className="text-sm text-gray-700">确定删除产品 <strong>{deleteConfirm.name}</strong>？</p>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button onClick={handleDelete} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">确认删除</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
}
