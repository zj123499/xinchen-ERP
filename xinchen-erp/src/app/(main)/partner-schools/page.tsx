"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, ChevronLeft, ChevronRight, RefreshCw,
  Building2, GraduationCap, Phone, Mail, MapPin, Plus,
  Trash2, Edit3, User, Upload, FileText, X, Globe,
} from "lucide-react";

interface PartnerSchoolItem {
  id: number;
  name: string;
  country?: string;
  city?: string;
  contactName?: string;
  contactEmail?: string;
  responsiblePerson?: string;
  contractUrl?: string;
  status: boolean;
  createdAt: string;
}

interface PaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: PartnerSchoolItem[];
}

export default function PartnerSchoolsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PartnerSchoolItem | null>(null);
  const [formData, setFormData] = useState({
    name: "", country: "", city: "", contactName: "",
    contactEmail: "", responsiblePerson: "", contractUrl: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<PartnerSchoolItem | null>(null);

  // 上传
  const [uploadTarget, setUploadTarget] = useState<PartnerSchoolItem | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      const res = await fetch(`/api/partner-schools?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch {
      console.error("获取合作院校失败");
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openNewForm() {
    setEditingItem(null);
    setFormData({ name: "", country: "", city: "", contactName: "", contactEmail: "", responsiblePerson: "", contractUrl: "" });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(item: PartnerSchoolItem) {
    setEditingItem(item);
    setFormData({
      name: item.name,
      country: item.country || "",
      city: item.city || "",
      contactName: item.contactName || "",
      contactEmail: item.contactEmail || "",
      responsiblePerson: item.responsiblePerson || "",
      contractUrl: item.contractUrl || "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const url = editingItem ? `/api/partner-schools/${editingItem.id}` : "/api/partner-schools";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
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
    } finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/partner-schools/${deleteConfirm.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setDeleteConfirm(null);
      fetchData();
    } catch { setFormError("删除失败"); }
  }

  async function handleUpload() {
    if (!uploadTarget || !uploadFile) return;
    setUploading(true); setUploadMsg("");
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("partnerId", String(uploadTarget.id));
      const res = await fetch("/api/partners/upload", { method: "POST", body: form });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "上传失败");
      // 更新 contractUrl
      await fetch(`/api/partner-schools/${uploadTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractUrl: d.id ? `/api/files/${d.id}` : "" }),
      });
      setUploadMsg("上传成功");
      setUploadFile(null);
      fetchData();
    } catch (e: any) { setUploadMsg(e.message); }
    finally { setUploading(false); }
  }

  function handleSearch() { setPage(1); fetchData(); }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">合作院校</h1>
          <p className="text-sm text-slate-500 mt-1">管理海外合作院校信息</p>
        </div>
        <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-5 h-5" />新增院校
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="搜索学校名称、联系人、国家..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button onClick={handleSearch} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">搜索</button>
          <button onClick={() => { setKeyword(""); setPage(1); }}
            className="p-2 text-gray-400 hover:text-slate-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
        ) : !data || data.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <GraduationCap className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无合作院校</p>
            <button onClick={openNewForm} className="mt-3 text-blue-600 text-sm hover:underline">添加第一个合作院校</button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学校名称</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">国家</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">城市</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">联系人</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">负责人</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-purple-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.country ? <span className="text-sm text-slate-600 flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-gray-400" />{s.country}</span> : <span className="text-sm text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      {s.city ? <span className="text-sm text-slate-600 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400" />{s.city}</span> : <span className="text-sm text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {s.contactName && <div className="text-sm text-slate-700 flex items-center gap-1"><User className="w-3.5 h-3.5 text-gray-400" />{s.contactName}</div>}
                        {s.contactEmail && <div className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{s.contactEmail}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.responsiblePerson ? <span className="text-sm text-slate-700">{s.responsiblePerson}</span> : <span className="text-sm text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setUploadTarget(s); setUploadFile(null); setUploadMsg(""); }}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition" title="上传合同">
                          <Upload className="w-5 h-5" />
                        </button>
                        <button onClick={() => openEditForm(s)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="编辑">
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(s)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="删除">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-slate-50">
                <span className="text-sm text-slate-500">共 {data.total} 条，第 {data.page}/{data.totalPages} 页</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                    className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition"><ChevronLeft className="w-5 h-5" /></button>
                  {Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, data.totalPages - 4));
                    const pn = start + i;
                    if (pn > data.totalPages) return null;
                    return (
                      <button key={pn} onClick={() => setPage(pn)}
                        className={`w-8 h-8 text-sm rounded transition ${pn === page ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-gray-200"}`}>{pn}</button>
                    );
                  })}
                  <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                    className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition"><ChevronRight className="w-5 h-5" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{editingItem ? "编辑院校" : "新增院校"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-slate-600 rounded transition">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">学校名称 <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData(d => ({ ...d, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">国家</label>
                  <input type="text" value={formData.country} onChange={(e) => setFormData(d => ({ ...d, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="如：英国" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">所在城市</label>
                  <input type="text" value={formData.city} onChange={(e) => setFormData(d => ({ ...d, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="如：伦敦" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">联系人</label>
                  <input type="text" value={formData.contactName} onChange={(e) => setFormData(d => ({ ...d, contactName: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">联系邮箱</label>
                  <input type="email" value={formData.contactEmail} onChange={(e) => setFormData(d => ({ ...d, contactEmail: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">负责人</label>
                  <input type="text" value={formData.responsiblePerson} onChange={(e) => setFormData(d => ({ ...d, responsiblePerson: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">合同链接</label>
                  <input type="text" value={formData.contractUrl} onChange={(e) => setFormData(d => ({ ...d, contractUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="上传后自动填入" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                  {submitting ? "保存中..." : editingItem ? "保存修改" : "确认新增"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-xl"><h2 className="text-lg font-semibold text-red-800">确认删除</h2></div>
            <div className="p-6">
              <p className="text-sm text-slate-700">确定要删除合作院校 <strong>{deleteConfirm.name}</strong> 吗？</p>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-slate-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button onClick={handleDelete} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition">确认删除</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">上传合同 - {uploadTarget.name}</h2>
              <button onClick={() => setUploadTarget(null)} className="text-gray-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">支持 PDF、图片、Word、Excel，最大 20MB</p>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              {uploadFile && <p className="text-sm text-slate-600 mt-2">已选择: {uploadFile.name}</p>}
              {uploadMsg && <p className={`text-sm mt-3 ${uploadMsg.startsWith("❌") ? "text-red-500" : "text-green-600"}`}>{uploadMsg}</p>}
              <div className="flex gap-3 mt-4">
                <button onClick={handleUpload} disabled={!uploadFile || uploading}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  <Upload className="w-5 h-5" />{uploading ? "上传中..." : "上传"}
                </button>
                <button onClick={() => setUploadTarget(null)} className="py-2 px-6 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
