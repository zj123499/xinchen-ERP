"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

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
  contract: { id: number; contractNo: string } | null;
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
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedOffers, setExpandedOffers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  // Offer 表单状态
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [offerForm, setOfferForm] = useState({ applicationId: "", institutionName: "", majorName: "", offerType: "conditional", deadline: "", submittedAt: "", status: "RECEIVED" });
  const [offerError, setOfferError] = useState("");
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerAppSearch, setOfferAppSearch] = useState("");
  const [offerAppResults, setOfferAppResults] = useState<any[]>([]);
  const [offerSelectedApp, setOfferSelectedApp] = useState<any>(null);
  const [offerAppFilter, setOfferAppFilter] = useState({ institution: "" });
  const [form, setForm] = useState({
    studentId: "", contractId: "", institutionName: "", majorName: "",
    degree: "硕士", intakeYear: new Date().getFullYear() + 1, intakeMonth: 9,
    status: "PREPARING", remark: "",
  });
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<{ id: number; name: string; phone: string }[]>([]);
  const [contractResults, setContractResults] = useState<{ id: number; contractNo: string }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string } | null>(null);
  const [selectedContract, setSelectedContract] = useState<{ id: number; contractNo: string } | null>(null);
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

  const fetchOffersForApp = async (appId: number) => {
    try {
      const res = await fetch(`/api/offers?applicationId=${appId}&pageSize=50`);
      const data = await res.json();
      return data.list || [];
    } catch { return []; }
  };

  // Offer 关联申请搜索
  const searchOfferApps = async (q: string, institution?: string) => {
    setOfferAppSearch(q);
    try {
      const params = new URLSearchParams({ pageSize: "20" });
      if (q) params.set("keyword", q);
      const res = await fetch(`/api/applications?${params}`);
      const data = await res.json();
      let list = data.list || [];
      const fi = institution || offerAppFilter.institution;
      if (fi) list = list.filter((a: any) => a.institutionName === fi);
      setOfferAppResults(list);
    } catch (e) { console.error(e); }
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOfferSubmitting(true); setOfferError("");
    try {
      const url = editingOffer ? `/api/offers/${editingOffer.id}` : "/api/offers";
      const method = editingOffer ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(offerForm) });
      if (!res.ok) { const d = await res.json(); setOfferError(d.error || "失败"); return; }
      setShowOfferForm(false); setExpandedId(null); fetchList();
    } catch { setOfferError("网络错误"); }
    finally { setOfferSubmitting(false); }
  };

  const handleDeleteOffer = async (id: number) => {
    if (!confirm("确定删除此Offer？")) return;
    await fetch(`/api/offers/${id}`, { method: "DELETE" });
    setExpandedId(null); fetchList();
  };

  const openOfferEdit = async (id: number) => {
    try {
      const res = await fetch(`/api/offers/${id}`);
      const data = await res.json();
      setEditingOffer(data);
      setOfferForm({
        applicationId: String(data.applicationId), institutionName: data.institutionName,
        majorName: data.majorName, offerType: data.offerType,
        deadline: data.deadline ? data.deadline.slice(0, 10) : "",
        submittedAt: data.submittedAt ? data.submittedAt.slice(0, 10) : "", status: data.status,
      });
      setOfferSelectedApp({ id: data.applicationId, institutionName: data.institutionName, student: data.application?.student, majorName: data.majorName });
      setShowOfferForm(true);
    } catch { alert("加载失败"); }
  };

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

  const fetchContracts = useCallback(async (studentId: number) => {
    try {
      const res = await fetch(`/api/contracts?studentId=${studentId}&pageSize=50`);
      const data = await res.json();
      if (res.ok) setContractResults(data.list || []);
    } catch (e) { console.error(e); }
  }, []);

  const [intentions, setIntentions] = useState<any[]>([]);

  const selectStudent = (s: { id: number; name: string }) => {
    setSelectedStudent(s);
    setForm(f => ({ ...f, studentId: String(s.id) }));
    setStudentResults([]);
    setStudentSearch(s.name);
    setContractResults([]);
    setSelectedContract(null);
    setForm(f => ({ ...f, contractId: "" }));
    fetchContracts(s.id);
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
    setForm({ studentId: "", contractId: "", institutionName: "", majorName: "", degree: "硕士", intakeYear: new Date().getFullYear() + 1, intakeMonth: 9, status: "PREPARING", remark: "" });
    setSelectedStudent(null); setSelectedContract(null);
    setStudentSearch("");
    setStudentResults([]);
    setContractResults([]);
    setError(""); setShowModal(true);
  };

  const openEdit = async (id: number) => {
    setError("");
    try {
      const res = await fetch(`/api/applications/${id}`);
      const data = await res.json();
      if (res.ok) {
        setEditingId(id);
        setForm({ studentId: String(data.studentId), contractId: String(data.contractId), institutionName: data.institutionName, majorName: data.majorName, degree: data.degree, intakeYear: data.intakeYear, intakeMonth: data.intakeMonth, status: data.status, remark: data.remark || "" });
        setSelectedStudent(data.student); setSelectedContract(data.contract);
        setStudentSearch(data.student?.name || ""); setShowModal(true);
      }
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async () => {
    if (!form.studentId || !form.contractId || !form.institutionName || !form.majorName) {
      setError("学生、合同、院校和专业为必填项"); return;
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
        <h1 className="text-2xl font-bold text-gray-900">申请与Offer管理</h1>
        <div className="flex gap-2">
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"><Plus className="w-4 h-4" />新增申请</button>
        </div>
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
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">合同</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">关联</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">截止日期</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">加载中...</td></tr>
            : list.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">暂无数据</td></tr>
            : list.map(item => (<>
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.student.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{item.institutionName}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{item.majorName}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.degree} / {item.intakeYear}.{String(item.intakeMonth).padStart(2, "0")}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{item.contract?.contractNo || "-"}</td>
                <td className="px-4 py-3"><span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_MAP[item.status]?.color || "bg-gray-100 text-gray-800"}`}>{STATUS_MAP[item.status]?.label || item.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs">
                    {item._count.offers > 0 ? (
                      <button onClick={async (e) => { e.stopPropagation(); 
                        if (expandedId === item.id) { setExpandedId(null); } 
                        else { const offs = await fetchOffersForApp(item.id); setExpandedOffers(offs); setExpandedId(item.id); }
                      }} className="text-green-600 hover:underline">Offer×{item._count.offers}</button>
                    ) : <span className="text-gray-400">Offer×0</span>}
                    {item._count.visas > 0 && <span className="text-blue-600">签证×{item._count.visas}</span>}
                  </div></td>
                <td className="px-4 py-3 text-sm">
                  {(() => {
                    if (expandedOffers.length > 0) {
                      const next = expandedOffers.filter((o: any) => o.deadline).sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];
                      if (next?.deadline) {
                        const days = Math.ceil((new Date(next.deadline).getTime() - Date.now()) / 86400000);
                        return <span className={days <= 7 ? "text-red-600 font-medium" : "text-gray-700"}>{new Date(next.deadline).toLocaleDateString("zh-CN")}{days <= 7 && <span className="text-xs ml-1">({days}天)</span>}</span>;
                      }
                    }
                    return <span className="text-gray-400">-</span>;
                  })()}
                </td>
                <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-1">
                  <button onClick={(e) => { e.stopPropagation(); (setEditingOffer(null), setOfferForm({ applicationId: String(item.id), institutionName: item.institutionName, majorName: item.majorName, offerType: "conditional", deadline: "", submittedAt: "", status: "RECEIVED" }), setOfferSelectedApp({ id: item.id, institutionName: item.institutionName, student: item.student, majorName: item.majorName }), setOfferAppSearch(""), setOfferAppResults([]), setOfferAppFilter({ institution: "" }), setShowOfferForm(true)); }} title="新增 Offer" className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"><Plus className="w-4 h-4" /></button>
                  <button title="编辑" onClick={() => openEdit(item.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit className="w-4 h-4" /></button>
                  <button title="删除" onClick={() => setDeleteConfirm(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>
              {expandedId === item.id && (
                <tr key={`offer-${item.id}`} className="bg-gray-50">
                  <td colSpan={9} className="px-4 py-2">
                    <div className="text-xs font-medium text-gray-700 mb-2">Offer 列表（{expandedOffers.length}）</div>
                    {expandedOffers.length === 0 ? (
                      <p className="text-xs text-gray-400">暂无Offer，点右侧「+ Offer」新增</p>
                    ) : (
                      <table className="w-full bg-white rounded text-xs">
                        <thead className="text-gray-500 bg-gray-50">
                          <tr>
                            <th className="px-2 py-1.5 text-left">院校/专业</th>
                            <th className="px-2 py-1.5 text-left">类型</th>
                            <th className="px-2 py-1.5 text-left">截止日期</th>
                            <th className="px-2 py-1.5 text-left">提交日期</th>
                            <th className="px-2 py-1.5 text-left">状态</th>
                            <th className="px-2 py-1.5 text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expandedOffers.map((o: any) => (
                            <tr key={o.id} className="border-t">
                              <td className="px-2 py-1.5">{o.institutionName} · {o.majorName}</td>
                              <td className="px-2 py-1.5">{o.offerType === "conditional" ? "有条件" : o.offerType === "unconditional" ? "无条件" : o.offerType}</td>
                              <td className="px-2 py-1.5 text-red-600">{o.deadline ? new Date(o.deadline).toLocaleDateString("zh-CN") : "-"}</td>
                              <td className="px-2 py-1.5 text-gray-500">{o.submittedAt ? new Date(o.submittedAt).toLocaleDateString("zh-CN") : "-"}</td>
                              <td className="px-2 py-1.5"><span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{o.status}</span></td>
                              <td className="px-2 py-1.5 text-right">
                                <button onClick={() => openOfferEdit(o.id)} className="text-blue-500 hover:underline mr-2">编辑</button>
                                <button onClick={() => handleDeleteOffer(o.id)} className="text-red-500 hover:underline">删除</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </td>
                </tr>
              )}
            </>))}
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
              <div><label className="block text-sm font-medium text-gray-700 mb-1">合同 <span className="text-red-500">*</span></label>
                {selectedContract ? (
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg"><span className="text-sm font-medium text-blue-700">{selectedContract.contractNo}</span><button onClick={() => { setSelectedContract(null); setForm(f => ({ ...f, contractId: "" })); }} className="text-xs text-red-500 hover:text-red-700">移除</button></div>
                ) : selectedStudent ? (
                  <select value={form.contractId} onChange={e => { setForm(f => ({ ...f, contractId: e.target.value })); const o = contractResults.find(r => r.id === parseInt(e.target.value)); if (o) setSelectedContract(o); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="">选择合同</option>{contractResults.map(o => (<option key={o.id} value={o.id}>{o.contractNo}</option>))}</select>
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
      {/* Offer 新增/编辑表单 */}
      {showOfferForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">{editingOffer ? "编辑 Offer" : "新增 Offer"}</h2>
            <form onSubmit={handleOfferSubmit} className="space-y-4">
              {offerError && <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{offerError}</div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">关联申请 *</label>
                {offerSelectedApp ? (
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                    <span className="text-sm">{offerSelectedApp.student?.name || "未知"} · {offerSelectedApp.institutionName}</span>
                    <button type="button" onClick={() => { setOfferSelectedApp(null); setOfferForm(f => ({ ...f, applicationId: "" })); }} className="text-xs text-red-500">更换</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" placeholder="搜索申请..." value={offerAppSearch} onChange={e => searchOfferApps(e.target.value)} onFocus={() => { if (offerAppResults.length === 0 && !offerAppSearch) searchOfferApps(""); }} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                    <select value={offerAppFilter.institution} onChange={e => { const v = e.target.value; setOfferAppFilter(f => ({ institution: v })); searchOfferApps(offerAppSearch, v); }} className="px-2 py-2 border rounded-lg text-sm"><option value="">所有</option>{[...new Set(offerAppResults.map((a: any) => a.institutionName))].map((i: any) => <option key={i} value={i}>{i}</option>)}</select>
                  </div>
                )}
                {offerAppResults.length > 0 && !offerSelectedApp && (
                  <div className="border rounded-lg mt-1 max-h-40 overflow-y-auto">
                    {offerAppResults.map((a: any) => (
                      <div key={a.id} onClick={() => { setOfferSelectedApp(a); setOfferForm(f => ({ ...f, applicationId: String(a.id), institutionName: a.institutionName, majorName: a.majorName })); setOfferAppResults([]); }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0">
                        <span className="font-medium">{a.student?.name || "?"}</span><span className="text-gray-500 ml-2">{a.institutionName} · {a.majorName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">类型</label><select value={offerForm.offerType} onChange={e => setOfferForm(f => ({ ...f, offerType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="conditional">有条件录取</option><option value="unconditional">无条件录取</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">状态</label><select value={offerForm.status} onChange={e => setOfferForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="RECEIVED">已收到</option><option value="ACCEPTED">已接受</option><option value="DECLINED">已拒绝</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label><input type="date" value={offerForm.deadline} onChange={e => setOfferForm(f => ({ ...f, deadline: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">提交日期</label><input type="date" value={offerForm.submittedAt} onChange={e => setOfferForm(f => ({ ...f, submittedAt: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowOfferForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg">取消</button>
                <button type="submit" disabled={offerSubmitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50">{offerSubmitting ? "保存中..." : "保存"}</button>
              </div>
            </form>
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