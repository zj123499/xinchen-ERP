"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";

interface OfferItem {
  id: number;
  institutionName: string;
  majorName: string;
  offerType: string;
  conditions: string | null;
  deadline: string | null;
  status: string;
  offerDate: string;
  application: {
    id: number;
    institutionName: string;
    majorName: string;
    degree: string;
    student: { id: number; name: string; phone: string };
    order: { id: number; orderNo: string };
  };
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: "已收到", color: "bg-blue-100 text-blue-800" },
  ACCEPTED: { label: "已接受", color: "bg-green-100 text-green-800" },
  DECLINED: { label: "已拒绝", color: "bg-red-100 text-red-800" },
  EXPIRED: { label: "已过期", color: "bg-gray-100 text-gray-600" },
};

export default function OffersPage() {
  const router = useRouter();
  const initialApplicationId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("applicationId") : null;
  const [list, setList] = useState<OfferItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    applicationId: "", institutionName: "", majorName: "",
    offerType: "CONDITIONAL", conditions: "", deadline: "",
    status: "RECEIVED", offerDate: new Date().toISOString().slice(0, 10),
  });
  const [appSearch, setAppSearch] = useState("");
  const [appResults, setAppResults] = useState<{ id: number; institutionName: string; majorName: string; student: { name: string } }[]>([]);
  const [selectedApp, setSelectedApp] = useState<{ id: number; institutionName: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (keyword) params.set("keyword", keyword);
      if (statusFilter) params.set("status", statusFilter);
      if (initialApplicationId) params.set("applicationId", initialApplicationId);
      const res = await fetch(`/api/offers?${params}`);
      const data = await res.json();
      if (res.ok) { setList(data.list); setTotal(data.total); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [page, pageSize, keyword, statusFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);
  const totalPages = Math.ceil(total / pageSize);

  const searchApps = useCallback(async (q: string) => {
    setAppSearch(q);
    if (q.length < 2) { setAppResults([]); return; }
    try {
      const res = await fetch(`/api/applications?keyword=${encodeURIComponent(q)}&pageSize=10`);
      const data = await res.json();
      if (res.ok) setAppResults(data.list || []);
    } catch (e) { console.error(e); }
  }, []);

  const selectApp = (a: { id: number; institutionName: string }) => {
    setSelectedApp(a); setForm(f => ({ ...f, applicationId: String(a.id) })); setAppResults([]); setAppSearch(a.institutionName);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ applicationId: "", institutionName: "", majorName: "", offerType: "CONDITIONAL", conditions: "", deadline: "", status: "RECEIVED", offerDate: new Date().toISOString().slice(0, 10) });
    setSelectedApp(null); setAppSearch(""); setAppResults([]); setError(""); setShowModal(true);
  };

  const openEdit = async (id: number) => {
    setError("");
    try {
      const res = await fetch(`/api/offers/${id}`);
      const data = await res.json();
      if (res.ok) {
        setEditingId(id);
        setForm({ applicationId: String(data.applicationId), institutionName: data.institutionName, majorName: data.majorName, offerType: data.offerType, conditions: data.conditions || "", deadline: data.deadline ? data.deadline.slice(0, 10) : "", status: data.status, offerDate: data.offerDate ? data.offerDate.slice(0, 10) : "" });
        setSelectedApp(data.application); setAppSearch(data.application?.institutionName || ""); setShowModal(true);
      }
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async () => {
    if (!form.applicationId || !form.institutionName || !form.majorName) { setError("申请、院校和专业为必填项"); return; }
    setSubmitting(true); setError("");
    try {
      const url = editingId ? `/api/offers/${editingId}` : "/api/offers";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) { setShowModal(false); fetchList(); } else { setError(data.error || "保存失败"); }
    } catch (e) { setError("网络错误"); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/offers/${id}`, { method: "DELETE" });
      if (res.ok) { setDeleteConfirm(null); fetchList(); }
      else { const data = await res.json(); alert(data.error || "删除失败"); setDeleteConfirm(null); }
    } catch (e) { alert("网络错误"); setDeleteConfirm(null); }
  };
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Offer管理</h1>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"><Plus className="w-4 h-4" />新增Offer</button>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="搜索院校/专业..." value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">全部状态</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">学生</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">院校</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">专业</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offer日期</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">截止日期</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">加载中...</td></tr>
            : list.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">暂无数据</td></tr>
            : list.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.application.student.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{item.institutionName}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{item.majorName}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.offerType === "CONDITIONAL" ? "有条件" : item.offerType === "UNCONDITIONAL" ? "无条件" : item.offerType}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{new Date(item.offerDate).toLocaleDateString("zh-CN")}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.deadline ? new Date(item.deadline).toLocaleDateString("zh-CN") : "-"}</td>
                <td className="px-4 py-3"><span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_MAP[item.status]?.color || "bg-gray-100 text-gray-800"}`}>{STATUS_MAP[item.status]?.label || item.status}</span></td>
                <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">
                  <button onClick={() => router.push(`/offers/${item.id}`)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => openEdit(item.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-500">共 {total} 条</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm text-gray-700">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">{editingId ? "编辑Offer" : "新增Offer"}</h2>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">关联申请 <span className="text-red-500">*</span></label>
                {selectedApp ? (
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg"><span className="text-sm font-medium text-blue-700">{selectedApp.institutionName}</span><button onClick={() => { setSelectedApp(null); setForm(f => ({ ...f, applicationId: "" })); setAppSearch(""); }} className="text-xs text-red-500 hover:text-red-700">移除</button></div>
                ) : (
                  <div className="relative"><input type="text" placeholder="搜索申请..." value={appSearch} onChange={e => searchApps(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    {appResults.length > 0 && (<div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">{appResults.map(a => (<div key={a.id} onClick={() => selectApp(a)} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm">{a.institutionName} - {a.majorName} <span className="text-gray-400 ml-2">({a.student.name})</span></div>))}</div>)}
                  </div>
                )}
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">院校 <span className="text-red-500">*</span></label><input type="text" value={form.institutionName} onChange={e => setForm(f => ({ ...f, institutionName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">专业 <span className="text-red-500">*</span></label><input type="text" value={form.majorName} onChange={e => setForm(f => ({ ...f, majorName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Offer类型</label><select value={form.offerType} onChange={e => setForm(f => ({ ...f, offerType: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="CONDITIONAL">有条件录取</option><option value="UNCONDITIONAL">无条件录取</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">状态</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">{Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Offer日期</label><input type="date" value={form.offerDate} onChange={e => setForm(f => ({ ...f, offerDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label><input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">录取条件</label><textarea value={form.conditions} onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="如：雅思6.5，GPA 3.0" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button><button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? "保存中..." : "保存"}</button></div>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm"><h3 className="text-lg font-semibold mb-2">确认删除</h3><p className="text-sm text-gray-500 mb-4">确定要删除该Offer吗？</p><div className="flex justify-end gap-3"><button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button><button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">删除</button></div></div>
        </div>
      )}
    </div>
  );
}
