"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";

interface ApplicationItem {
  id: number;
  institutionName: string;
  majorName: string;
  degree: string;
  intakeYear: number;
  intakeMonth: number;
  status: string;
  createdAt: string;
  student: { id: number; name: string; phone: string };
  order: { id: number; orderNo: string; productName: string };
  _count: { offers: number; visas: number };
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PREPARING: { label: "准备中", color: "bg-gray-100 text-gray-800" },
  SUBMITTED: { label: "已提交", color: "bg-blue-100 text-blue-800" },
  REVIEWING: { label: "审核中", color: "bg-yellow-100 text-yellow-800" },
  OFFER: { label: "已获Offer", color: "bg-green-100 text-green-800" },
  REJECTED: { label: "已拒", color: "bg-red-100 text-red-800" },
  DEFERRED: { label: "延期", color: "bg-purple-100 text-purple-800" },
  ACCEPTED: { label: "已接受", color: "bg-emerald-100 text-emerald-800" },
};

export default function ApplicationsPage() {
  const router = useRouter();
  const [list, setList] = useState<ApplicationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    studentId: "", orderId: "", institutionName: "", majorName: "",
    degree: "硕士", intakeYear: new Date().getFullYear() + 1, intakeMonth: 9,
    status: "PREPARING", remark: "",
  });
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<{ id: number; name: string; phone: string }[]>([]);
  const [orderResults, setOrderResults] = useState<{ id: number; orderNo: string; productName: string }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<{ id: number; orderNo: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (keyword) params.set("keyword", keyword);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/applications?${params}`);
      const data = await res.json();
      if (res.ok) { setList(data.list); setTotal(data.total); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [page, pageSize, keyword, statusFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const totalPages = Math.ceil(total / pageSize);

  // 按需加载最近学生（onFocus触发，不是初始加载）
  const loadRecentStudents = useCallback(() => {
    fetch("/api/students?pageSize=20").then(r => r.json()).then(d => setStudentResults(d.list || [])).catch(() => {});
  }, []);

  const searchStudents = useCallback(async (q: string) => {
    setStudentSearch(q);
    if (q.length < 2) { loadRecentStudents(); return; }
    try {
      const res = await fetch(`/api/students?keyword=${encodeURIComponent(q)}&pageSize=10`);
      const data = await res.json();
      if (res.ok) setStudentResults(data.list || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchOrders = useCallback(async (studentId: number) => {
    try {
      const res = await fetch(`/api/orders?studentId=${studentId}&pageSize=50`);
      const data = await res.json();
      if (res.ok) setOrderResults(data.list || []);
    } catch (e) { console.error(e); }
  }, []);

  const [intentions, setIntentions] = useState<any[]>([]);

  const selectStudent = (s: { id: number; name: string }) => {
    setSelectedStudent(s);
    setForm(f => ({ ...f, studentId: String(s.id) }));
    setStudentResults([]);
    setStudentSearch(s.name);
    setOrderResults([]);
    setSelectedOrder(null);
    setForm(f => ({ ...f, orderId: "" }));
    fetchOrders(s.id);
    // 加载该学生的申请意向，自动预填院校/专业
    fetch(`/api/students/${s.id}/intentions`).then(r => r.json()).then(d => {
      const items = d.list || [];
      setIntentions(items);
      if (items.length > 0) {
        const first = items[0];
        setForm(f => ({
          ...f,
          institutionName: f.institutionName || first.institution || "",
          majorName: f.majorName || first.major || "",
          degree: f.degree || first.degree || "硕士",
        }));
      }
    }).catch(() => {});
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ studentId: "", orderId: "", institutionName: "", majorName: "", degree: "硕士", intakeYear: new Date().getFullYear() + 1, intakeMonth: 9, status: "PREPARING", remark: "" });
    setSelectedStudent(null); setSelectedOrder(null);
    setStudentSearch("");
    setStudentResults([]);
    setOrderResults([]);
    setError(""); setShowModal(true);
  };

  const openEdit = async (id: number) => {
    setError("");
    try {
      const res = await fetch(`/api/applications/${id}`);
      const data = await res.json();
      if (res.ok) {
        setEditingId(id);
        setForm({ studentId: String(data.studentId), orderId: String(data.orderId), institutionName: data.institutionName, majorName: data.majorName, degree: data.degree, intakeYear: data.intakeYear, intakeMonth: data.intakeMonth, status: data.status, remark: data.remark || "" });
        setSelectedStudent(data.student); setSelectedOrder(data.order);
        setStudentSearch(data.student?.name || ""); setShowModal(true);
      }
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async () => {
    if (!form.studentId || !form.orderId || !form.institutionName || !form.majorName) {
      setError("学生、订单、院校和专业为必填项"); return;
    }
    setSubmitting(true); setError("");
    try {
      const url = editingId ? `/api/applications/${editingId}` : "/api/applications";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) { setShowModal(false); fetchList(); } else { setError(data.error || "保存失败"); }
    } catch (e) { setError("网络错误"); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (res.ok) { setDeleteConfirm(null); fetchList(); }
      else { const data = await res.json(); alert(data.error || "删除失败"); setDeleteConfirm(null); }
    } catch (e) { alert("网络错误"); setDeleteConfirm(null); }
  };
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">申请管理</h1>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"><Plus className="w-4 h-4" />新增申请</button>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="搜索院校/专业/学生..." value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">学位/入学</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">关联</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">加载中...</td></tr>
            : list.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">暂无数据</td></tr>
            : list.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.student.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{item.institutionName}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{item.majorName}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.degree} / {item.intakeYear}.{String(item.intakeMonth).padStart(2, "0")}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{item.order.orderNo}</td>
                <td className="px-4 py-3"><span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_MAP[item.status]?.color || "bg-gray-100 text-gray-800"}`}>{STATUS_MAP[item.status]?.label || item.status}</span></td>
                <td className="px-4 py-3"><div className="flex items-center gap-2 text-xs text-gray-500">{item._count.offers > 0 && <span className="text-green-600">Offer×{item._count.offers}</span>}{item._count.visas > 0 && <span className="text-blue-600">签证×{item._count.visas}</span>}</div></td>
                <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">
                  <button onClick={() => router.push(`/applications/${item.id}`)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Eye className="w-4 h-4" /></button>
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
            <h2 className="text-lg font-semibold mb-4">{editingId ? "编辑申请" : "新增申请"}</h2>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">学生 <span className="text-red-500">*</span></label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg"><span className="text-sm font-medium text-blue-700">{selectedStudent.name}</span><button onClick={() => { setSelectedStudent(null); setForm(f => ({ ...f, studentId: "" })); setStudentSearch(""); }} className="text-xs text-red-500 hover:text-red-700">移除</button></div>
                ) : (
                  <div className="relative"><input type="text" placeholder="点击选择或搜索学生..." value={studentSearch} onChange={e => searchStudents(e.target.value)} onFocus={() => { if (studentResults.length === 0) { loadRecentStudents(); }; }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    {studentResults.length > 0 && (<div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">{studentResults.map(s => (<div key={s.id} onClick={() => selectStudent(s)} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm">{s.name} <span className="text-gray-400 ml-2">{s.phone}</span></div>))}</div>)}
                  </div>
                )}
              </div>
              {intentions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">申请意向（点击快速填充）</label>
                  <div className="flex flex-wrap gap-1.5">
                    {intentions.map((it: any, idx: number) => (
                      <button key={it.id} onClick={() => setForm(f => ({
                        ...f,
                        institutionName: it.institution || f.institutionName,
                        majorName: it.major || f.majorName,
                        degree: it.degree || f.degree,
                      }))}
                        className={`text-xs px-2 py-1 rounded border transition ${idx === 0 ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300"}`}
                        title={`${it.country} · ${it.institution || "—"} · ${it.major || "—"}`}>
                        {it.country}{it.institution ? ` · ${it.institution}` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">订单 <span className="text-red-500">*</span></label>
                {selectedOrder ? (
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg"><span className="text-sm font-medium text-blue-700">{selectedOrder.orderNo}</span><button onClick={() => { setSelectedOrder(null); setForm(f => ({ ...f, orderId: "" })); }} className="text-xs text-red-500 hover:text-red-700">移除</button></div>
                ) : selectedStudent ? (
                  <select value={form.orderId} onChange={e => { setForm(f => ({ ...f, orderId: e.target.value })); const o = orderResults.find(r => r.id === parseInt(e.target.value)); if (o) setSelectedOrder(o); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="">选择订单</option>{orderResults.map(o => (<option key={o.id} value={o.id}>{o.orderNo} - {o.productName}</option>))}</select>
                ) : (<p className="text-sm text-gray-400">请先选择学生</p>)}
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">院校 <span className="text-red-500">*</span></label><input type="text" value={form.institutionName} onChange={e => setForm(f => ({ ...f, institutionName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="如：马来亚大学" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">专业 <span className="text-red-500">*</span></label><input type="text" value={form.majorName} onChange={e => setForm(f => ({ ...f, majorName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="如：计算机科学" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">学位</label><select value={form.degree} onChange={e => setForm(f => ({ ...f, degree: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">{[ "本科", "硕士", "博士", "预科", "语言", "其他" ].map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">入学年份</label><input type="number" value={form.intakeYear} onChange={e => setForm(f => ({ ...f, intakeYear: parseInt(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">入学月份</label><select value={form.intakeMonth} onChange={e => setForm(f => ({ ...f, intakeMonth: parseInt(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}</select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">状态</label><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">{Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">备注</label><textarea value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="可选备注信息" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button><button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? "保存中..." : "保存"}</button></div>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm"><h3 className="text-lg font-semibold mb-2">确认删除</h3><p className="text-sm text-gray-500 mb-4">确定要删除该申请吗？如有关联Offer将无法删除。</p><div className="flex justify-end gap-3"><button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button><button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">删除</button></div></div>
        </div>
      )}
    </div>
  );
}