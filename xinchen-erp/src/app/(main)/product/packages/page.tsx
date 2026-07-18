"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, Package } from "lucide-react";

interface PackageItem {
  id: number;
  discount: number | null;
  parentProduct: { id: number; name: string };
  childProduct: { id: number; name: string; price: number } | null;
}
interface ProductItem { id: number; name: string; }

export default function ProductPackagesPage() {
  const [data, setData] = useState<PackageItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ parentProductId: "", childProductId: "", discount: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<PackageItem | null>(null);

  function fetchData() {
    setLoading(true);
    fetch("/api/product-packages").then((r) => r.json()).then((d) => setData(d.list || [])).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => {
    fetchData();
    fetch("/api/products").then((r) => r.json()).then((d) => setProducts((d.list as ProductItem[]) || [])).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setFormError("");
    if (!form.parentProductId || !form.childProductId) { setFormError("请选择父产品和子产品"); setSubmitting(false); return; }
    if (form.parentProductId === form.childProductId) { setFormError("父产品和子产品不能相同"); setSubmitting(false); return; }
    try {
      const res = await fetch("/api/product-packages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) { setFormError(result.error || "保存失败"); return; }
      setShowForm(false); setForm({ parentProductId: "", childProductId: "", discount: "" }); fetchData();
    } catch { setFormError("网络错误"); } finally { setSubmitting(false); }
  }
  async function handleDelete() {
    if (!deleteConfirm) return;
    await fetch(`/api/product-packages/${deleteConfirm.id}`, { method: "DELETE" });
    setDeleteConfirm(null); fetchData();
  }

  const productName = (id: string) => products.find((p) => p.id.toString() === id)?.name || "";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">产品套餐</h1>
          <p className="text-sm text-gray-500 mt-1">将多个产品组合为套餐，设置组合折扣</p></div>
        <button onClick={() => { setFormError(""); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> 新增套餐</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
          : data.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Package className="w-12 h-12 mb-3 text-gray-300" /><p className="text-sm">暂无套餐</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-blue-600 text-sm hover:underline">添加第一个套餐</button></div>
            : <table className="w-full"><thead><tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">父产品</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">子产品</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">子产品价</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">折扣(%)</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr></thead><tbody className="divide-y divide-gray-100">
              {data.map((p) => <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.parentProduct.name}</td>
                <td className="px-4 py-3 text-gray-600">{p.childProduct?.name || "-"}</td>
                <td className="px-4 py-3 text-gray-700">¥{p.childProduct?.price || 0}</td>
                <td className="px-4 py-3 text-gray-600">{p.discount != null ? p.discount : "-"}</td>
                <td className="px-4 py-3"><button onClick={() => setDeleteConfirm(p)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button></td>
              </tr>)}
            </tbody></table>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">新增套餐</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">父产品（套餐）</label>
                <select value={form.parentProductId} onChange={(e) => setForm({ ...form, parentProductId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">请选择</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">子产品（捆绑项）</label>
                <select value={form.childProductId} onChange={(e) => setForm({ ...form, childProductId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">请选择</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">折扣(%)</label>
                <input value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} type="number" step="0.01" placeholder="如 10 表示九折" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
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
            <div className="p-6"><p className="text-sm text-gray-700">确定删除套餐 <strong>{deleteConfirm.parentProduct.name} + {deleteConfirm.childProduct?.name}</strong>？</p>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button onClick={handleDelete} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">确认删除</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
}
