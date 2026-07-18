"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, RefreshCw, ChevronLeft, ChevronRight, FileEdit,
  CheckCircle, Clock, Trash2, FolderOpen, FileCheck, X,
} from "lucide-react";

interface TaskItem {
  id: number;
  applicationId: number;
  taskType: string;
  assignedToId: number;
  status: string;
  content?: string;
  reviewNote?: string;
  dueDate?: string;
  completedAt?: string;
  application: {
    id: number; institutionName: string; majorName: string;
    student: { id: number; name: string };
  };
}

interface MaterialItem {
  id: number;
  applicationId: number;
  name: string;
  type: string;
  status: string;
  dueDate?: string;
  fileUrl?: string;
}

interface PaginatedResponse {
  total: number; page: number; pageSize: number; totalPages: number; list: TaskItem[];
}

interface Option { id: number; realName?: string; username?: string; }
interface AppOption { id: number; institutionName: string; majorName: string; student?: { name: string }; }

const TASK_TYPES = ["个人陈述(PS)", "推荐信(RL)", "简历(CV)", "文书润色", "网申填写", "材料翻译", "其他"];
const TASK_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "待处理", color: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "进行中", color: "bg-blue-100 text-blue-700" },
  completed: { label: "已完成", color: "bg-green-100 text-green-700" },
};
const MATERIAL_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "待收集", color: "bg-gray-100 text-gray-600" },
  collecting: { label: "收集中", color: "bg-yellow-100 text-yellow-700" },
  received: { label: "已收到", color: "bg-blue-100 text-blue-700" },
  verified: { label: "已核验", color: "bg-green-100 text-green-700" },
};
const MATERIAL_TYPES = ["成绩单", "毕业证", "学位证", "护照", "语言成绩", "存款证明", "推荐信", "个人陈述", "其他"];

export default function CopywriterPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ applicationId: "", taskType: TASK_TYPES[0], assignedToId: "", content: "", dueDate: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [apps, setApps] = useState<AppOption[]>([]);
  const [deleteTask, setDeleteTask] = useState<TaskItem | null>(null);

  // 材料抽屉
  const [materialApp, setMaterialApp] = useState<TaskItem | null>(null);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [materialLoading, setMaterialLoading] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ name: "", type: MATERIAL_TYPES[0] });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/copywriter-tasks?` + params.toString());
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      console.error("获取文书任务失败");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch("/api/employees?pageSize=1000").then(r => r.json()).then(d => setUsers(d.list || [])).catch(() => {});
    fetch("/api/applications?pageSize=1000").then(r => r.json()).then(d => setApps(d.list || [])).catch(() => {});
  }, []);

  async function handleTaskSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/copywriter-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskForm),
      });
      if (!res.ok) { setFormError((await res.json()).error || "操作失败"); return; }
      setShowTaskForm(false);
      setTaskForm({ applicationId: "", taskType: TASK_TYPES[0], assignedToId: "", content: "", dueDate: "" });
      fetchData();
    } catch { setFormError("网络错误"); } finally { setSubmitting(false); }
  }

  async function handleTaskStatus(t: TaskItem, status: string) {
    await fetch(`/api/copywriter-tasks/` + t.id, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    fetchData();
  }

  async function handleDeleteTask() {
    if (!deleteTask) return;
    await fetch(`/api/copywriter-tasks/` + deleteTask.id, { method: "DELETE" });
    setDeleteTask(null);
    fetchData();
  }

  async function openMaterials(t: TaskItem) {
    setMaterialApp(t);
    setMaterialLoading(true);
    try {
      const res = await fetch(`/api/application-materials?applicationId=` + t.applicationId);
      const d = await res.json();
      setMaterials(d.list || []);
    } catch { setMaterials([]); } finally { setMaterialLoading(false); }
  }

  async function addMaterial() {
    if (!materialApp || !newMaterial.name) return;
    await fetch("/api/application-materials", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: materialApp.applicationId, name: newMaterial.name, type: newMaterial.type }),
    });
    setNewMaterial({ name: "", type: MATERIAL_TYPES[0] });
    openMaterials(materialApp);
  }

  async function updateMaterialStatus(m: MaterialItem, status: string) {
    await fetch(`/api/application-materials/` + m.id, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    if (materialApp) openMaterials(materialApp);
  }

  async function deleteMaterial(m: MaterialItem) {
    await fetch(`/api/application-materials/` + m.id, { method: "DELETE" });
    if (materialApp) openMaterials(materialApp);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">文书工作台</h1>
          <p className="text-sm text-gray-500 mt-1">管理文书任务分配与申请材料核验进度</p>
        </div>
        <button onClick={() => { setFormError(""); setShowTaskForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4" />新建文书任务
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部状态</option>
            {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={() => { setStatusFilter(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
        ) : !data || data.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FileEdit className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无文书任务</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学生 / 申请</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">任务类型</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">截止</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{t.application.student.name}</div>
                      <div className="text-xs text-gray-400">{t.application.institutionName} · {t.application.majorName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{t.taskType}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t.dueDate ? new Date(t.dueDate).toLocaleDateString("zh-CN") : "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${TASK_STATUS[t.status]?.color}`}>{TASK_STATUS[t.status]?.label || t.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {t.status === "pending" && (
                          <button onClick={() => handleTaskStatus(t, "in_progress")} className="px-2 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition" title="开始"><Clock className="w-3 h-3" /></button>
                        )}
                        {t.status === "in_progress" && (
                          <button onClick={() => handleTaskStatus(t, "completed")} className="px-2 py-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded transition" title="完成"><CheckCircle className="w-3 h-3" /></button>
                        )}
                        <button onClick={() => openMaterials(t)} className="px-2 py-1 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 rounded transition" title="材料清单"><FolderOpen className="w-3 h-3" /></button>
                        <button onClick={() => setDeleteTask(t)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="删除"><Trash2 className="w-4 h-4" /></button>
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

      {/* 新建任务弹窗 */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">新建文书任务</h2>
              <button onClick={() => setShowTaskForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition">✕</button>
            </div>
            <form onSubmit={handleTaskSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">关联申请 <span className="text-red-500">*</span></label>
                <select required value={taskForm.applicationId} onChange={(e) => setTaskForm((d) => ({ ...d, applicationId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">请选择申请</option>
                  {apps.map((a) => <option key={a.id} value={a.id}>{a.student?.name} - {a.institutionName} {a.majorName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">任务类型 <span className="text-red-500">*</span></label>
                  <select required value={taskForm.taskType} onChange={(e) => setTaskForm((d) => ({ ...d, taskType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">截止日期</label>
                  <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((d) => ({ ...d, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">负责人（文书老师）<span className="text-red-500">*</span></label>
                <select required value={taskForm.assignedToId} onChange={(e) => setTaskForm((d) => ({ ...d, assignedToId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">请选择负责人</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.user?.realName || u.user?.username || u.name || `员工${u.id}`}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">任务说明</label>
                <textarea value={taskForm.content} onChange={(e) => setTaskForm((d) => ({ ...d, content: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="任务要求..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowTaskForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">{submitting ? "保存中..." : "确认新建"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 材料清单抽屉 */}
      {materialApp && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="bg-white w-full max-w-md h-full shadow-xl overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">材料清单</h2>
                <p className="text-xs text-gray-400">{materialApp.application.student.name} · {materialApp.application.institutionName}</p>
              </div>
              <button onClick={() => setMaterialApp(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <select value={newMaterial.type} onChange={(e) => setNewMaterial((d) => ({ ...d, type: e.target.value }))}
                  className="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={newMaterial.name} onChange={(e) => setNewMaterial((d) => ({ ...d, name: e.target.value }))} placeholder="材料名称"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <button onClick={addMaterial} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"><Plus className="w-4 h-4" /></button>
              </div>
              {materialLoading ? (
                <div className="flex items-center justify-center py-10 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
              ) : materials.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">暂无材料，请在上方添加</div>
              ) : (
                <div className="space-y-2">
                  {materials.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{m.name}</div>
                        <span className="text-xs text-gray-400">{m.type}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select value={m.status} onChange={(e) => updateMaterialStatus(m, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full border-0 outline-none ${MATERIAL_STATUS[m.status]?.color || "bg-gray-100"}`}>
                          {Object.entries(MATERIAL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <button onClick={() => deleteMaterial(m)} className="p-1 text-gray-400 hover:text-red-600 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2 text-xs text-gray-500">
                    <FileCheck className="w-4 h-4 text-green-500" />
                    已核验 {materials.filter((m) => m.status === "verified").length} / {materials.length}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-xl">
              <h2 className="text-lg font-semibold text-red-800">确认删除</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-700">确定删除 {deleteTask.application.student.name} 的「{deleteTask.taskType}」任务吗？</p>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setDeleteTask(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button onClick={handleDeleteTask} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition">确认删除</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
