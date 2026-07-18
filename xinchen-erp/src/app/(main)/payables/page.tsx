"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, ChevronLeft, ChevronRight, RefreshCw, DollarSign, Calendar } from "lucide-react";

interface PayableItem {
  id: number;
  category: string;
  title: string;
  amount: string;
  currency: string;
  paidAmount: string;
  status: string;
  dueDate: string | null;
  partner: { id: number; name: string } | null;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  UNRECONCILED: { label: "未对账", cls: "bg-gray-100 text-gray-600" },
  PARTIAL: { label: "部分对账", cls: "bg-amber-100 text-amber-700" },
  RECONCILED: { label: "已对账", cls: "bg-green-100 text-green-700" },
};

const CATEGORY_MAP: Record<string, string> = {
  SCHOOL: "学校", PARTNER: "合作方", VENDOR: "供应商", OTHER: "其他",
};

const CURRENCY_MAP: Record<string, string> = {
  CNY: "¥", USD: "$", GBP: "£", AUD: "A$", CAD: "C$", SGD: "S$", MYR: "RM",
};

const pageSize = 20;

export default function PayablesPage() {
  const [data, setData] = useState<{ total: number; page: number; totalPages: number; list: PayableItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    partnerId: "", category: "SCHOOL", title: "", amount: "",
    currency: "CNY", exchangeRate: "1", paidAmount: "0",
    fiscalYear: new Date().getFullYear(), fiscalMonth: new Date().getMonth() + 1,
    dueDate: "", remark: "",
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [partners, setPartners] = useState<{ id: number; name: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchKeyword) params.set("keyword", searchKeyword);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(`/api/payables?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch { } finally { setLoading(false); }
  }, [searchKeyword, page, statusFilter, categoryFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch("/api/partners?pageSize=100").then((r) => r.json()).then((d) => setPartners(d.list || [])).catch(() => {});
  }, []);

  function handleSearch() { setPage(1); setSearchKeyword(keyword); }

  function openCreate() {
    setEditId(null);
    setForm({
      partnerId: "", category: "SCHOOL", title: "", amount: "",
      currency: "CNY", exchangeRate: "1", paidAmount: "0",
      fiscalYear: new Date().getFullYear(), fiscalMonth: new Date().getMonth() + 1,
      dueDate: "", remark: "",
    });
    setFormError(""); setShowModal(true);
  }

  async function openEdit(item: PayableItem) {
    setEditId(item.id);
    setForm({
      partnerId: item.partner ? String(item.partner.id) : "",
      category: item.category, title: item.title, amount: String(item.amount),
      currency: item.currency, exchangeRate: "1", paidAmount: String(item.paidAmount),
      fiscalYear: new Date().getFullYear(), fiscalMonth: new Date().getMonth() + 1,
      dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split("T")[0] : "", remark: "",
    });
    setFormError(""); setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category) { setFormError("请选择应付类别"); return; }
    if (!form.title.trim()) { setFormError("请输入标题"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setFormError("请输入有效金额"); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/payables/${editId}` : "/api/payables";
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { setFormError((await res.json()).error || "保存失败"); return; }
      setShowModal(false); fetchData();
    } catch { setFormError("网络错误"); } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("确定删除这条应付记录吗？")) return;
    await fetch(`/api/payables/${id}`, { method: "DELETE" });
    fetchData();
  }

  const fmt = (amt: string, cur: string) => `${CURRENCY_MAP[cur] || ""}${Number(amt).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">应付账款</h1>
          <p className="text-sm text-gray-500 mt-1">管理应付学校/合作方/供应商的款项</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"><Plus className="w-4 h-4" /> 新增应付</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="搜索标题、合作方名称..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部类别</option>{Object.entries(CATEGORY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部状态</option>{Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={handleSearch} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">搜索</button>
          <button onClick={() => { setKeyword(""); setSearchKeyword(""); setStatusFilter(""); setCategoryFilter(""); setPage(1); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : !data || data.list.length === 0 ? (
          <div className="text-center py-20 text-gray-400"><DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-sm">暂无应付记录</p><button onClick={openCreate} className="mt-3 text-sm text-blue-600 hover:text-blue-700">新增应付</button></div>
        ) : (
          <>
            <table className="w-full">
              <thead><tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">标题</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">类别</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">合作方</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">金额</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">已付</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">状态</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">操作</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900">{item.title}</div></td>
                    <td className="px-6 py-4"><span className="text-sm text-gray-600">{CATEGORY_MAP[item.category] || item.category}</span></td>
                    <td className="px-6 py-4"><span className="text-sm text-gray-600">{item.partner ? item.partner.name : "—"}</span></td>
                    <td className="px-6 py-4 text-right"><span className="text-sm font-semibold text-gray-900">{fmt(item.amount, item.currency)}</span></td>
                    <td className="px-6 py-4 text-right"><span className="text-sm text-gray-600">{fmt(item.paidAmount, item.currency)}</span></td>
                    <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded-full ${STATUS_MAP[item.status]?.cls || "bg-gray-100 text-gray-600"}`}>{STATUS_MAP[item.status]?.label || item.status}</span></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="编辑">✎</button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="删除">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">共 {data.total} 条，第 {data.page}/{data.totalPages} 页</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30 transition"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded disabled:opacity-30 transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editId ? "编辑应付" : "新增应付"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">类别</label>
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">{Object.entries(CATEGORY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">合作方</label>
                  <select value={form.partnerId} onChange={(e) => setForm((f) => ({ ...f, partnerId: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"><option value="">— 无 —</option>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="如：XX学校返佣" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">金额</label>
                  <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">已付金额</label>
                  <input type="number" step="0.01" value={form.paidAmount} onChange={(e) => setForm((f) => ({ ...f, paidAmount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">币种</label>
                  <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">{Object.entries(CURRENCY_MAP).map(([k, v]) => <option key={k} value={k}>{k} ({v})</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">到期日</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea value={form.remark} onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button type="submit" disabled={saving} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">{saving ? "保存中..." : "保存"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
