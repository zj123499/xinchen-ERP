"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, ChevronLeft, ChevronRight, RefreshCw,
  Trash2, Edit3, Phone, Video, MessageCircle, Users,
  Smile, Meh, Frown, Angry, Star,
} from "lucide-react";

interface VisitRecordItem {
  id: number;
  studentId: number;
  visitType: string;
  visitDate: string;
  duration?: number;
  satisfaction?: number;
  mood?: string;
  summary?: string;
  studentFeedback?: string;
  hasUpsellNeed: boolean;
  upsellType?: string;
  upsellDetail?: string;
  hasReferral: boolean;
  referralContact?: string;
  needFollowUp: boolean;
  nextFollowUpAt?: string;
  actionItems?: any;
  createdAt: string;
  student: { id: number; name: string; phone: string };
  visitor: { id: number; realName: string; username: string };
  plan?: { id: number; stage: string; purpose: string } | null;
}

interface PaginatedResponse {
  total: number; page: number; pageSize: number; totalPages: number;
  list: VisitRecordItem[];
}

interface StudentOption { id: number; name: string; phone: string; }

const VISIT_TYPE_MAP: Record<string, { label: string; icon: any; color: string }> = {
  PHONE: { label: "电话", icon: Phone, color: "bg-green-100 text-green-700" },
  WECHAT: { label: "微信", icon: MessageCircle, color: "bg-blue-100 text-blue-700" },
  FACE_TO_FACE: { label: "面谈", icon: Users, color: "bg-purple-100 text-purple-700" },
  VIDEO: { label: "视频", icon: Video, color: "bg-orange-100 text-orange-700" },
};

const MOOD_MAP: Record<string, { label: string; color: string }> = {
  SATISFIED: { label: "满意", color: "text-green-500" },
  NEUTRAL: { label: "一般", color: "text-gray-500" },
  ANXIOUS: { label: "焦虑", color: "text-yellow-500" },
  DISSATISFIED: { label: "不满意", color: "text-red-500" },
};

const UPSELL_TYPE_MAP: Record<string, string> = {
  UPGRADE: "升级", RENEWAL: "续费", FAMILY: "家庭",
  WORK_VISA: "工签", IMMIGRATION: "移民", OTHER_SERVICE: "其他服务",
};

export default function VisitRecordsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitTypeFilter, setVisitTypeFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<VisitRecordItem | null>(null);
  const [formData, setFormData] = useState({
    studentId: "", visitType: "PHONE", visitDate: "", duration: "", satisfaction: "", mood: "",
    summary: "", studentFeedback: "", hasUpsellNeed: false, upsellType: "", upsellDetail: "",
    hasReferral: false, referralContact: "", needFollowUp: false, nextFollowUpAt: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<VisitRecordItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (visitTypeFilter) params.set("visitType", visitTypeFilter);
      if (searchKeyword) params.set("keyword", searchKeyword);
      const res = await fetch(`/api/visit-records?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch (err) {
      console.error("获取回访记录失败", err);
    } finally { setLoading(false); }
  }, [page, visitTypeFilter, searchKeyword]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch("/api/students?pageSize=200").then(r => r.json()).then(d => setStudents(d.list || [])).catch(() => {});
  }, []);

  function openNewForm() {
    setEditingItem(null);
    setFormData({
      studentId: "", visitType: "PHONE", visitDate: new Date().toISOString().slice(0, 16), duration: "",
      satisfaction: "", mood: "", summary: "", studentFeedback: "", hasUpsellNeed: false,
      upsellType: "", upsellDetail: "", hasReferral: false, referralContact: "",
      needFollowUp: false, nextFollowUpAt: "",
    });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(item: VisitRecordItem) {
    setEditingItem(item);
    setFormData({
      studentId: String(item.studentId),
      visitType: item.visitType,
      visitDate: item.visitDate ? new Date(item.visitDate).toISOString().slice(0, 16) : "",
      duration: item.duration ? String(item.duration) : "",
      satisfaction: item.satisfaction ? String(item.satisfaction) : "",
      mood: item.mood || "",
      summary: item.summary || "",
      studentFeedback: item.studentFeedback || "",
      hasUpsellNeed: item.hasUpsellNeed,
      upsellType: item.upsellType || "",
      upsellDetail: item.upsellDetail || "",
      hasReferral: item.hasReferral,
      referralContact: item.referralContact || "",
      needFollowUp: item.needFollowUp,
      nextFollowUpAt: item.nextFollowUpAt ? new Date(item.nextFollowUpAt).toISOString().slice(0, 16) : "",
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
        visitType: formData.visitType,
        visitDate: formData.visitDate,
        duration: formData.duration || undefined,
        satisfaction: formData.satisfaction || undefined,
        mood: formData.mood || undefined,
        summary: formData.summary || undefined,
        studentFeedback: formData.studentFeedback || undefined,
        hasUpsellNeed: formData.hasUpsellNeed,
        upsellType: formData.hasUpsellNeed ? (formData.upsellType || undefined) : undefined,
        upsellDetail: formData.hasUpsellNeed ? (formData.upsellDetail || undefined) : undefined,
        hasReferral: formData.hasReferral,
        referralContact: formData.hasReferral ? (formData.referralContact || undefined) : undefined,
        needFollowUp: formData.needFollowUp,
        nextFollowUpAt: formData.needFollowUp ? (formData.nextFollowUpAt || undefined) : undefined,
      };
      const url = editingItem ? `/api/visit-records/${editingItem.id}` : "/api/visit-records";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const err = await res.json(); setFormError(err.error || "操作失败"); return; }
      setShowForm(false);
      fetchData();
    } catch { setFormError("网络错误"); }
    finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      await fetch(`/api/visit-records/${deleteConfirm.id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      fetchData();
    } catch { setFormError("删除失败"); }
  }

  function handleSearch() { setPage(1); setSearchKeyword(keyword); }

  const vt = VISIT_TYPE_MAP;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">回访记录</h1>
          <p className="text-sm text-gray-500 mt-1">管理学生回访记录，跟踪满意度与增购转介绍机会</p>
        </div>
        <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4" />新增回访
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={visitTypeFilter} onChange={(e) => { setVisitTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部方式</option>
            {Object.entries(VISIT_TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="搜索学生姓名、回访摘要..." className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none flex-1 max-w-xs" />
          <button onClick={handleSearch} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">搜索</button>
          <button onClick={() => { setKeyword(""); setSearchKeyword(""); setVisitTypeFilter(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : !data || data.list.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Phone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">暂无回访记录</p>
            <button onClick={openNewForm} className="mt-3 text-blue-600 text-sm hover:underline">添加第一条回访</button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学生</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">回访方式</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">回访日期</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">满意度</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">情绪</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">摘要</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{r.student.name}</div>
                      <div className="text-xs text-gray-400">{r.student.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${vt[r.visitType]?.color || "bg-gray-100 text-gray-600"}`}>
                        {vt[r.visitType]?.label || r.visitType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(r.visitDate).toLocaleDateString("zh-CN")}</td>
                    <td className="px-4 py-3">
                      {r.satisfaction ? (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < r.satisfaction! ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                          ))}
                        </div>
                      ) : <span className="text-sm text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.mood ? <span className={`text-sm font-medium ${MOOD_MAP[r.mood]?.color || "text-gray-500"}`}>{MOOD_MAP[r.mood]?.label || r.mood}</span> : <span className="text-sm text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                      {r.summary || "-"}
                      {r.hasUpsellNeed && <span className="inline-flex ml-1 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">增购</span>}
                      {r.hasReferral && <span className="inline-flex ml-1 text-xs px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700">转介绍</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditForm(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="编辑"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteConfirm(r)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="删除"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-sm text-gray-500">共 {data.total} 条，第 {data.page}/{data.totalPages} 页</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (data.totalPages <= 5) pageNum = i + 1;
                  else if (page <= 3) pageNum = i + 1;
                  else if (page >= data.totalPages - 2) pageNum = data.totalPages - 4 + i;
                  else pageNum = page - 2 + i;
                  return <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-8 h-8 text-sm rounded transition ${pageNum === page ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}>{pageNum}</button>;
                })}
                <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editingItem ? "编辑回访" : "新增回访"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">学生 <span className="text-red-500">*</span></label>
                  <select required value={formData.studentId} onChange={e => setFormData(d => ({ ...d, studentId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">请选择学生</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} - {s.phone}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">回访方式 <span className="text-red-500">*</span></label>
                  <select required value={formData.visitType} onChange={e => setFormData(d => ({ ...d, visitType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {Object.entries(VISIT_TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">回访日期 <span className="text-red-500">*</span></label>
                  <input type="datetime-local" required value={formData.visitDate} onChange={e => setFormData(d => ({ ...d, visitDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">时长(分钟)</label>
                  <input type="number" value={formData.duration} onChange={e => setFormData(d => ({ ...d, duration: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="分钟" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">满意度(1-5)</label>
                  <input type="number" min="1" max="5" value={formData.satisfaction} onChange={e => setFormData(d => ({ ...d, satisfaction: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="1-5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">情绪状态</label>
                <select value={formData.mood} onChange={e => setFormData(d => ({ ...d, mood: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">未评估</option>
                  {Object.entries(MOOD_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">回访摘要</label>
                <textarea value={formData.summary} onChange={e => setFormData(d => ({ ...d, summary: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="回访要点..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学生反馈</label>
                <textarea value={formData.studentFeedback} onChange={e => setFormData(d => ({ ...d, studentFeedback: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="学生的反馈意见..." />
              </div>

              <div className="border-t pt-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.hasUpsellNeed} onChange={e => setFormData(d => ({ ...d, hasUpsellNeed: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium text-gray-700">有增购/升级需求</span>
                </label>
                {formData.hasUpsellNeed && (
                  <div className="grid grid-cols-2 gap-4 ml-6">
                    <select value={formData.upsellType} onChange={e => setFormData(d => ({ ...d, upsellType: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="">选择类型</option>
                      {Object.entries(UPSELL_TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input type="text" value={formData.upsellDetail} onChange={e => setFormData(d => ({ ...d, upsellDetail: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="需求详情" />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.hasReferral} onChange={e => setFormData(d => ({ ...d, hasReferral: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium text-gray-700">获得转介绍</span>
                </label>
                {formData.hasReferral && (
                  <div className="ml-6">
                    <input type="text" value={formData.referralContact} onChange={e => setFormData(d => ({ ...d, referralContact: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="转介绍联系人信息" />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.needFollowUp} onChange={e => setFormData(d => ({ ...d, needFollowUp: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium text-gray-700">需要继续跟进</span>
                </label>
                {formData.needFollowUp && (
                  <div className="ml-6">
                    <input type="datetime-local" value={formData.nextFollowUpAt} onChange={e => setFormData(d => ({ ...d, nextFollowUpAt: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                )}
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

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-xl"><h2 className="text-lg font-semibold text-red-800">确认删除</h2></div>
            <div className="p-6">
              <p className="text-sm text-gray-700">确定要删除 {deleteConfirm.student.name} 的回访记录吗？</p>
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
