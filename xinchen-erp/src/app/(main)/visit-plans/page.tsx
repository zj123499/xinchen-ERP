"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, RefreshCw, ChevronLeft, ChevronRight, CalendarClock,
  CheckCircle, SkipForward, Trash2, MoreHorizontal, User, AlertTriangle,
} from "lucide-react";

interface PlanItem {
  id: number;
  studentId: number;
  stage: string;
  triggerType: string;
  scheduledAt: string;
  daysOffset?: number;
  purpose: string;
  assigneeId: number;
  status: string;
  recordCount: number;
  createdAt: string;
  student: { id: number; name: string; phone?: string };
  assignee: { id: number; realName: string; username: string };
}

interface PaginatedResponse {
  total: number; page: number; pageSize: number; totalPages: number; list: PlanItem[];
}

interface Option { id: number; name?: string; realName?: string; username?: string; }

const STAGE_MAP: Record<string, string> = {
  AFTER_SIGN: "签约后", APPLICATION: "申请中", OFFER_STAGE: "Offer阶段",
  VISA_STAGE: "签证阶段", AFTER_ENROLL: "入学后", LONG_TERM: "长期维护",
};
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待回访", color: "bg-yellow-100 text-yellow-700" },
  COMPLETED: { label: "已完成", color: "bg-green-100 text-green-700" },
  SKIPPED: { label: "已跳过", color: "bg-gray-100 text-gray-600" },
};

export default function VisitPlansPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    studentId: "", stage: "AFTER_SIGN", triggerType: "SCHEDULED",
    scheduledAt: "", daysOffset: "", purpose: "", assigneeId: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [students, setStudents] = useState<Option[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<PlanItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (statusFilter) params.set("status", statusFilter);
      if (stageFilter) params.set("stage", stageFilter);
      const res = await fetch(`/api/visit-plans?` + params.toString());
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      console.error("获取回访计划失败");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, stageFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch("/api/students?pageSize=1000").then(r => r.json()).then(d => setStudents(d.list || [])).catch(() => {});
    fetch("/api/employees?pageSize=1000").then(r => r.json()).then(d => setUsers(d.list || [])).catch(() => {});
  }, []);

  function openNewForm() {
    setFormData({ studentId: "", stage: "AFTER_SIGN", triggerType: "SCHEDULED", scheduledAt: "", daysOffset: "", purpose: "", assigneeId: "" });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/visit-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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

  async function handleStatusChange(p: PlanItem, newStatus: string) {
    try {
      await fetch(`/api/visit-plans/` + p.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchData();
    } catch {
      console.error("状态变更失败");
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      await fetch(`/api/visit-plans/` + deleteConfirm.id, { method: "DELETE" });
      setDeleteConfirm(null);
      fetchData();
    } catch {
      console.error("删除失败");
    }
  }

  const now = new Date();
  const isOverdue = (p: PlanItem) => p.status === "PENDING" && new Date(p.scheduledAt) < now;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">回访计划</h1>
          <p className="text-sm text-gray-500 mt-1">按生命周期阶段编排客户回访任务，到期提醒负责人执行</p>
        </div>
        <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4" />新建计划
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部状态</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部阶段</option>
            {Object.entries(STAGE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={() => { setStatusFilter(""); setStageFilter(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
        ) : !data || data.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <CalendarClock className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无回访计划</p>
            <button onClick={openNewForm} className="mt-3 text-blue-600 text-sm hover:underline">创建第一个回访计划</button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学生</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">阶段</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">回访目的</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">计划时间</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">负责人</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{p.student.name}</div>
                      <div className="text-xs text-gray-400">{p.student.phone || "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{STAGE_MAP[p.stage] || p.stage}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[220px] truncate">{p.purpose}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        {isOverdue(p) && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                        <span className={isOverdue(p) ? "text-red-600 font-medium" : "text-gray-500"}>{new Date(p.scheduledAt).toLocaleDateString("zh-CN")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.assignee.realName || p.assignee.username}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_MAP[p.status]?.color}`}>{STATUS_MAP[p.status]?.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {p.status === "PENDING" && (
                          <>
                            <button onClick={() => handleStatusChange(p, "COMPLETED")} className="px-2 py-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded transition" title="标记完成"><CheckCircle className="w-3 h-3" /></button>
                            <button onClick={() => handleStatusChange(p, "SKIPPED")} className="px-2 py-1 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 rounded transition" title="跳过"><SkipForward className="w-3 h-3" /></button>
                          </>
                        )}
                        <button onClick={() => setDeleteConfirm(p)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="删除"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-sm text-gray-500">共 {data.total} 条，第 {data.page}/{data.totalPages} 页</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, data.totalPages - 4));
                  const p = start + i;
                  if (p > data.totalPages) return null;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 text-sm rounded transition ${p === page ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}>{p}</button>
                  );
                })}
                <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                  className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">新建回访计划</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学生 <span className="text-red-500">*</span></label>
                <select required value={formData.studentId} onChange={(e) => setFormData((d) => ({ ...d, studentId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">请选择学生</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">回访阶段 <span className="text-red-500">*</span></label>
                  <select required value={formData.stage} onChange={(e) => setFormData((d) => ({ ...d, stage: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {Object.entries(STAGE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">触发方式</label>
                  <select value={formData.triggerType} onChange={(e) => setFormData((d) => ({ ...d, triggerType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="SCHEDULED">定时回访</option>
                    <option value="EVENT">事件触发</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">计划时间 <span className="text-red-500">*</span></label>
                  <input type="date" required value={formData.scheduledAt} onChange={(e) => setFormData((d) => ({ ...d, scheduledAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">相对天数偏移</label>
                  <input type="number" value={formData.daysOffset} onChange={(e) => setFormData((d) => ({ ...d, daysOffset: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="如签约后30天" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">负责人 <span className="text-red-500">*</span></label>
                <select required value={formData.assigneeId} onChange={(e) => setFormData((d) => ({ ...d, assigneeId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">请选择负责人</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.user?.realName || u.user?.username || u.name || `员工${u.id}`}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">回访目的 <span className="text-red-500">*</span></label>
                <textarea required value={formData.purpose} onChange={(e) => setFormData((d) => ({ ...d, purpose: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="回访目标与要点..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                  {submitting ? "保存中..." : "确认新建"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-xl">
              <h2 className="text-lg font-semibold text-red-800">确认删除</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">确定删除 {deleteConfirm.student.name} 的回访计划吗？</p>
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
