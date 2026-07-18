"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ChevronLeft, ChevronRight, RefreshCw,
  MessageSquare, User, Phone, Calendar, Filter, Plus,
  Trash2, Edit3,
} from "lucide-react";

interface FollowUpItem {
  id: number;
  type: string;
  content: string;
  nextPlan?: string;
  nextFollowUpAt?: string;
  createdAt: string;
  user: { id: number; realName: string };
  student: { id: number; name: string; phone: string };
  lead: { id: number; name: string; source: string; status: string } | null;
}

interface PaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: FollowUpItem[];
}

interface StudentOption {
  id: number;
  name: string;
  phone: string;
}

const FOLLOW_TYPE_MAP: Record<string, string> = {
  phone: "电话",
  wechat: "微信",
  visit: "面谈",
  other: "其他",
};

const FOLLOW_TYPE_COLOR: Record<string, string> = {
  phone: "bg-green-100 text-green-700",
  wechat: "bg-blue-100 text-blue-700",
  visit: "bg-purple-100 text-purple-700",
  other: "bg-gray-100 text-gray-600",
};

const FOLLOW_TYPES = ["phone", "wechat", "visit", "other"];

export default function FollowUpsPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const pageSize = 20;

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<FollowUpItem | null>(null);
  const [formData, setFormData] = useState({
    studentId: "", type: "phone", content: "", nextPlan: "", nextFollowUpAt: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<FollowUpItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchKeyword) params.set("keyword", searchKeyword);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/followups?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch (err) {
      console.error("获取跟进记录失败", err);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, page, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch("/api/students?pageSize=200").then(r => r.json()).then(d => {
      setStudents(d.list || []);
    }).catch(() => {});
  }, []);

  function openNewForm() {
    setEditingItem(null);
    setFormData({ studentId: "", type: "phone", content: "", nextPlan: "", nextFollowUpAt: "" });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(item: FollowUpItem) {
    setEditingItem(item);
    setFormData({
      studentId: String(item.student.id),
      type: item.type,
      content: item.content,
      nextPlan: item.nextPlan || "",
      nextFollowUpAt: item.nextFollowUpAt ? item.nextFollowUpAt.slice(0, 16) : "",
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
        type: formData.type,
        content: formData.content,
        nextPlan: formData.nextPlan || undefined,
        nextFollowUpAt: formData.nextFollowUpAt || undefined,
      };
      const url = editingItem ? `/api/followups/${editingItem.id}` : "/api/followups";
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
      await fetch(`/api/followups/${deleteConfirm.id}`, { method: "DELETE" });
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
          <h1 className="text-2xl font-bold text-gray-900">跟进记录</h1>
          <p className="text-sm text-gray-500 mt-1">管理学生跟进记录，记录每次沟通详情</p>
        </div>
        <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4" />新增跟进
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="搜索学生姓名、手机号或跟进内容..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="relative">
            <button onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition ${typeFilter ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
              <Filter className="w-4 h-4" /> 筛选 {typeFilter && <span className="w-2 h-2 rounded-full bg-blue-500" />}
            </button>
            {showFilter && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-3 min-w-[180px]">
                <div className="text-xs font-medium text-gray-500 mb-2">跟进方式</div>
                <div className="space-y-1">
                  <button onClick={() => { setTypeFilter(""); setPage(1); setShowFilter(false); }}
                    className={`w-full text-left px-2 py-1 text-sm rounded ${!typeFilter ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>全部</button>
                  {Object.entries(FOLLOW_TYPE_MAP).map(([k, v]) => (
                    <button key={k} onClick={() => { setTypeFilter(k); setPage(1); setShowFilter(false); }}
                      className={`w-full text-left px-2 py-1 text-sm rounded ${typeFilter === k ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>{v}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={handleSearch} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">搜索</button>
          <button onClick={() => { setKeyword(""); setSearchKeyword(""); setTypeFilter(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : !data || data.list.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">暂无跟进记录</p>
            <button onClick={openNewForm} className="mt-3 text-blue-600 text-sm hover:underline">添加第一条跟进</button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">学生</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">跟进方式</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">跟进内容</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">跟进人</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">下次跟进</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">跟进时间</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((fu) => (
                  <tr key={fu.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 cursor-pointer" onClick={() => router.push(`/students/${fu.student.id}`)}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-blue-600" /></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{fu.student.name}</div>
                          <div className="text-xs text-gray-400 flex items-center gap-0.5"><Phone className="w-3 h-3" /> {fu.student.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${FOLLOW_TYPE_COLOR[fu.type] || "bg-gray-100 text-gray-600"}`}>{FOLLOW_TYPE_MAP[fu.type] || fu.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 max-w-xs truncate" title={fu.content}>{fu.content}</div>
                      {fu.nextPlan && <div className="text-xs text-blue-600 mt-0.5 truncate max-w-xs">下一步: {fu.nextPlan}</div>}
                    </td>
                    <td className="px-6 py-4"><span className="text-sm text-gray-700">{fu.user.realName}</span></td>
                    <td className="px-6 py-4">
                      {fu.nextFollowUpAt ? <span className="text-sm text-gray-700 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gray-400" />{new Date(fu.nextFollowUpAt).toLocaleDateString("zh-CN")}</span> : <span className="text-sm text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4"><span className="text-sm text-gray-500">{new Date(fu.createdAt).toLocaleString("zh-CN")}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditForm(fu)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="编辑"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteConfirm(fu)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="删除"><Trash2 className="w-4 h-4" /></button>
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
              <h2 className="text-lg font-semibold text-gray-900">{editingItem ? "编辑跟进" : "新增跟进"}</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">跟进方式</label>
                <select value={formData.type} onChange={(e) => setFormData(d => ({ ...d, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  {FOLLOW_TYPES.map(t => <option key={t} value={t}>{FOLLOW_TYPE_MAP[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">跟进内容 <span className="text-red-500">*</span></label>
                <textarea required value={formData.content} onChange={(e) => setFormData(d => ({ ...d, content: e.target.value }))} rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="详细记录本次跟进内容..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">下一步计划</label>
                <textarea value={formData.nextPlan} onChange={(e) => setFormData(d => ({ ...d, nextPlan: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="下一步跟进计划..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">下次跟进时间</label>
                <input type="datetime-local" value={formData.nextFollowUpAt} onChange={(e) => setFormData(d => ({ ...d, nextFollowUpAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
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
              <p className="text-sm text-gray-700">确定要删除 {deleteConfirm.student.name} 的 {FOLLOW_TYPE_MAP[deleteConfirm.type] || deleteConfirm.type} 跟进记录吗？</p>
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
