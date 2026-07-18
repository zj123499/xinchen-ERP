"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, MoreHorizontal, ChevronLeft, ChevronRight,
  RefreshCw, User, Filter, Trash2, Edit2, Radio,
} from "lucide-react";

interface TouchpointItem {
  id: number;
  studentId: number;
  channel: string;
  source: string;
  medium?: string;
  campaign?: string;
  occurredAt: string;
  remark?: string;
  student?: { id: number; name: string; phone?: string };
}

interface PaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: TouchpointItem[];
}

const CHANNEL_MAP: Record<string, { label: string; color: string }> = {
  SEARCH: { label: "搜索引擎", color: "bg-blue-100 text-blue-800" },
  SOCIAL: { label: "新媒体", color: "bg-pink-100 text-pink-800" },
  REFERRAL: { label: "转介绍", color: "bg-green-100 text-green-800" },
  PARTNER: { label: "合作方", color: "bg-purple-100 text-purple-800" },
  SITE: { label: "站群", color: "bg-cyan-100 text-cyan-800" },
  OFFLINE: { label: "线下/展会", color: "bg-orange-100 text-orange-800" },
  OTHER: { label: "其他", color: "bg-gray-100 text-gray-800" },
};

const CHANNELS = Object.entries(CHANNEL_MAP).map(([k, v]) => ({ key: k, label: v.label }));

export default function TouchpointsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TouchpointItem | null>(null);
  const [students, setStudents] = useState<{ id: number; name: string }[]>([]);
  const [formData, setFormData] = useState({
    studentId: "",
    channel: "SOCIAL",
    source: "",
    medium: "",
    campaign: "",
    occurredAt: new Date().toISOString().slice(0, 16),
    remark: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<TouchpointItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      if (channelFilter) params.set("channel", channelFilter);
      const res = await fetch(`/api/touchpoints?${params.toString()}`);
      const result = await res.json();
      setData(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, keyword, channelFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  useEffect(() => {
    fetch("/api/students?pageSize=1000")
      .then((r) => r.json())
      .then((d) => setStudents(d.list || []))
      .catch(() => {});
  }, []);

  function openNew() {
    setEditing(null);
    setFormData({
      studentId: students[0]?.id ? String(students[0].id) : "",
      channel: "SOCIAL",
      source: "",
      medium: "",
      campaign: "",
      occurredAt: new Date().toISOString().slice(0, 16),
      remark: "",
    });
    setFormError("");
    setShowForm(true);
  }

  function openEdit(t: TouchpointItem) {
    setEditing(t);
    setFormData({
      studentId: String(t.studentId),
      channel: t.channel,
      source: t.source,
      medium: t.medium || "",
      campaign: t.campaign || "",
      occurredAt: new Date(t.occurredAt).toISOString().slice(0, 16),
      remark: t.remark || "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const payload = {
        studentId: formData.studentId ? parseInt(formData.studentId) : null,
        channel: formData.channel,
        source: formData.source,
        medium: formData.medium || null,
        campaign: formData.campaign || null,
        occurredAt: new Date(formData.occurredAt).toISOString(),
        remark: formData.remark || null,
      };
      const url = editing ? `/api/touchpoints/${editing.id}` : "/api/touchpoints";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        setFormError(result.error || "操作失败");
        return;
      }
      setShowForm(false);
      fetchList();
    } catch {
      setFormError("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/touchpoints/${deleteConfirm.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || "删除失败");
        return;
      }
      setDeleteConfirm(null);
      fetchList();
    } catch {
      setFormError("网络错误");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">触点管理</h1>
          <p className="text-sm text-gray-500 mt-1">记录学生各渠道获客触点，支持多触点归因分析</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4" /> 新增触点
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="搜索来源 / 活动 / 学生..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), fetchList())}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <select value={channelFilter}
            onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部渠道</option>
            {CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <button onClick={() => { setPage(1); fetchList(); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition">
            <RefreshCw className="w-4 h-4" /> 刷新
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> 加载中...
          </div>
        ) : !data || data.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Radio className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无触点数据</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学生</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">渠道</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">来源/媒介</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">活动</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">触点时间</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.list.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {t.student?.name || "未知"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${(CHANNEL_MAP[t.channel] || CHANNEL_MAP.OTHER).color}`}>
                          {(CHANNEL_MAP[t.channel] || CHANNEL_MAP.OTHER).label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {t.source || "-"}
                        {t.medium && <span className="text-gray-400"> / {t.medium}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{t.campaign || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(t.occurredAt).toLocaleString("zh-CN")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(t)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="编辑">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(t)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="删除">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-sm text-gray-500">共 {data.total} 条，第 {data.page}/{data.totalPages} 页</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                  className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? "编辑触点" : "新增触点"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">学生 <span className="text-red-500">*</span></label>
                <select required value={formData.studentId}
                  onChange={(e) => setFormData((d) => ({ ...d, studentId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">请选择学生</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">渠道类型 <span className="text-red-500">*</span></label>
                  <select required value={formData.channel}
                    onChange={(e) => setFormData((d) => ({ ...d, channel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">来源细分</label>
                  <input type="text" value={formData.source}
                    onChange={(e) => setFormData((d) => ({ ...d, source: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="如 抖音/小红书/百度" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">媒介</label>
                  <input type="text" value={formData.medium}
                    onChange={(e) => setFormData((d) => ({ ...d, medium: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="cpc/cpm/organic" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">活动/计划</label>
                  <input type="text" value={formData.campaign}
                    onChange={(e) => setFormData((d) => ({ ...d, campaign: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="活动名称" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">触点时间</label>
                <input type="datetime-local" value={formData.occurredAt}
                  onChange={(e) => setFormData((d) => ({ ...d, occurredAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea rows={2} value={formData.remark}
                  onChange={(e) => setFormData((d) => ({ ...d, remark: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={submitting}
                  className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                  {submitting ? "保存中..." : editing ? "保存修改" : "确认新增"}
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
              <p className="text-sm text-gray-700">确定删除该触点记录吗？相关归因结果将一并清除。</p>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button onClick={handleDelete} disabled={deleting}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition">
                  {deleting ? "删除中..." : "确认删除"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
