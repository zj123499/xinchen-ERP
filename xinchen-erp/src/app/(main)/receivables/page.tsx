"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, ChevronLeft, ChevronRight, RefreshCw, User, DollarSign, Calendar } from "lucide-react";

interface ReceivableItem {
  id: number;
  amount: string;
  currency: string;
  paidAmount: string;
  status: string;
  dueDate: string | null;
  fiscalYear: number;
  fiscalMonth: number;
  contractNo?: string;
  invoiceNo?: string;
  student: { id: number; name: string; phone: string };
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  UNRECONCILED: { label: "未对账", cls: "bg-gray-100 text-gray-600" },
  PARTIAL: { label: "部分对账", cls: "bg-amber-100 text-amber-700" },
  RECONCILED: { label: "已对账", cls: "bg-green-100 text-green-700" },
};

const CURRENCY_MAP: Record<string, string> = {
  CNY: "¥", USD: "$", GBP: "£", AUD: "A$", CAD: "C$", SGD: "S$", MYR: "RM",
};

const pageSize = 20;

export default function ReceivablesPage() {
  const [data, setData] = useState<{ total: number; page: number; totalPages: number; list: ReceivableItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    studentId: "", orderId: "", contractNo: "", invoiceNo: "",
    amount: "", currency: "CNY", exchangeRate: "1",
    paidAmount: "0", fiscalYear: new Date().getFullYear(), fiscalMonth: new Date().getMonth() + 1,
    dueDate: "", remark: "",
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [studentKeyword, setStudentKeyword] = useState("");
  const [studentOptions, setStudentOptions] = useState<{ id: number; name: string; phone: string }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string } | null>(null);
  const [studentTimer, setStudentTimer] = useState<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchKeyword) params.set("keyword", searchKeyword);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/receivables?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch { } finally { setLoading(false); }
  }, [searchKeyword, page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleSearch() { setPage(1); setSearchKeyword(keyword); }

  function openCreate() {
    setEditId(null);
    setForm({
      studentId: "", orderId: "", contractNo: "", invoiceNo: "",
      amount: "", currency: "CNY", exchangeRate: "1",
      paidAmount: "0", fiscalYear: new Date().getFullYear(), fiscalMonth: new Date().getMonth() + 1,
      dueDate: "", remark: "",
    });
    setSelectedStudent(null);
    setFormError("");
    setShowModal(true);
  }

  async function openEdit(item: ReceivableItem) {
    setEditId(item.id);
    setForm({
      studentId: String(item.student.id), orderId: "", contractNo: item.contractNo || "",
      invoiceNo: item.invoiceNo || "", amount: String(item.amount), currency: item.currency,
      exchangeRate: "1", paidAmount: String(item.paidAmount),
      fiscalYear: item.fiscalYear, fiscalMonth: item.fiscalMonth,
      dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split("T")[0] : "", remark: "",
    });
    setSelectedStudent({ id: item.student.id, name: item.student.name });
    setFormError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentId) { setFormError("请选择学生"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setFormError("请输入有效金额"); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/receivables/${editId}` : "/api/receivables";
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
    if (!confirm("确定删除这条应收记录吗？")) return;
    await fetch(`/api/receivables/${id}`, { method: "DELETE" });
    fetchData();
  }

  function searchStudents(kw: string) {
    setStudentKeyword(kw);
    if (studentTimer) clearTimeout(studentTimer);
    const t = setTimeout(async () => {
      if (!kw.trim()) { setStudentOptions([]); return; }
      const res = await fetch(`/api/students?keyword=${encodeURIComponent(kw)}&pageSize=10`);
      if (res.ok) setStudentOptions((await res.json()).list || []);
    }, 300);
    setStudentTimer(t);
  }

  function selectStudent(s: { id: number; name: string; phone: string }) {
    setForm((f) => ({ ...f, studentId: String(s.id) }));
    setSelectedStudent({ id: s.id, name: s.name });
    setStudentKeyword(""); setStudentOptions([]);
  }

  const fmt = (amt: string, cur: string) => `${CURRENCY_MAP[cur] || ""}${Number(amt).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">应收账款</h1>
          <p className="text-sm text-gray-500 mt-1">管理应向学生收取的款项及到账情况</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"><Plus className="w-4 h-4" /> 新增应收</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="搜索合同号、发票号、学生姓名/手机号..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部状态</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={handleSearch} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">搜索</button>
          <button onClick={() => { setKeyword(""); setSearchKeyword(""); setStatusFilter(""); setPage(1); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : !data || data.list.length === 0 ? (
          <div className="text-center py-20 text-gray-400"><DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-sm">暂无应收记录</p><button onClick={openCreate} className="mt-3 text-sm text-blue-600 hover:text-blue-700">新增应收</button></div>
        ) : (
          <>
            <table className="w-full">
              <thead><tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">学生</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">应收金额</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">已收金额</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">状态</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">到期日</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">操作</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center"><User className="w-3.5 h-3.5 text-blue-600" /></div>
                        <div><div className="text-sm font-medium text-gray-900">{item.student.name}</div><div className="text-xs text-gray-400">{item.student.phone}</div></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right"><span className="text-sm font-semibold text-gray-900">{fmt(item.amount, item.currency)}</span></td>
                    <td className="px-6 py-4 text-right"><span className="text-sm text-gray-600">{fmt(item.paidAmount, item.currency)}</span></td>
                    <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded-full ${STATUS_MAP[item.status]?.cls || "bg-gray-100 text-gray-600"}`}>{STATUS_MAP[item.status]?.label || item.status}</span></td>
                    <td className="px-6 py-4"><span className="text-sm text-gray-600 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gray-400" />{item.dueDate ? new Date(item.dueDate).toLocaleDateString("zh-CN") : "—"}</span></td>
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
              <h2 className="text-lg font-semibold">{editId ? "编辑应收" : "新增应收"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学生 <span className="text-red-500">*</span></label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm font-medium text-blue-700">{selectedStudent.name}</span>
                    <button type="button" onClick={() => { setSelectedStudent(null); setForm((f) => ({ ...f, studentId: "" })); }} className="text-xs text-blue-500">清除</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input value={studentKeyword} onChange={(e) => searchStudents(e.target.value)} placeholder="搜索学生姓名或手机号..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    {studentOptions.length > 0 && (
                      <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {studentOptions.map((s) => (
                          <button key={s.id} type="button" onClick={() => selectStudent(s)} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between"><span className="font-medium">{s.name}</span><span className="text-gray-400 text-xs">{s.phone}</span></button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">应收金额</label>
                  <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">已收金额</label>
                  <input type="number" step="0.01" value={form.paidAmount} onChange={(e) => setForm((f) => ({ ...f, paidAmount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">币种</label>
                  <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">{Object.entries(CURRENCY_MAP).map(([k, v]) => <option key={k} value={k}>{k} ({v})</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">到期日</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">合同号</label>
                  <input value={form.contractNo} onChange={(e) => setForm((f) => ({ ...f, contractNo: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">发票号</label>
                  <input value={form.invoiceNo} onChange={(e) => setForm((f) => ({ ...f, invoiceNo: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
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
