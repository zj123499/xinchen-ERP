"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, ChevronLeft, ChevronRight, GraduationCap, Phone, FileText, ClipboardCheck, Plus, X } from "lucide-react";

interface StudentItem {
  id: number;
  name: string;
  phone?: string;
  wechat?: string;
  targetCountry?: string;
  targetDegree?: string;
  currentStatus?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: number; realName: string };
  _count: { leads: number; followUps: number; contracts: number; applications: number };
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  LEAD: { label: "线索", color: "bg-blue-100 text-blue-800" },
  CONSULTING: { label: "咨询中", color: "bg-yellow-100 text-yellow-800" },
  SIGNED: { label: "已签约", color: "bg-purple-100 text-purple-800" },
  APPLYING: { label: "申请中", color: "bg-orange-100 text-orange-800" },
  OFFER: { label: "已录取", color: "bg-green-100 text-green-800" },
  VISA: { label: "签证中", color: "bg-cyan-100 text-cyan-800" },
  ENROLLED: { label: "已入学", color: "bg-emerald-100 text-emerald-800" },
  ALUMNI: { label: "已毕业", color: "bg-gray-100 text-gray-800" },
};

export default function StudentsPage() {
  const router = useRouter();
  const [data, setData] = useState<{ total: number; list: StudentItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "", gender: "", phone: "", wechat: "", email: "", nationality: "",
    targetCountry: "", targetDegree: "", targetMajor: "", currentStatus: "LEAD",
    budget: "", remark: "",
  });

  function openNewForm() {
    setForm({ name: "", gender: "", phone: "", wechat: "", email: "", nationality: "", targetCountry: "", targetDegree: "", targetMajor: "", currentStatus: "LEAD", budget: "", remark: "" });
    setFormError("");
    setShowForm(true);
  }

  async function handleCreate() {
    if (!form.name.trim()) { setFormError("姓名不能为空"); return; }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || `创建失败 (${res.status})`);
      setShowForm(false);
      fetchStudents();
    } catch (err: any) {
      setFormError(err.message || "创建失败");
    } finally { setSubmitting(false); }
  }

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (keyword) params.set("keyword", keyword);
      const res = await fetch(`/api/students?${params}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `请求失败 (${res.status})`);
      }
      setData(await res.json());
    } catch (err: any) {
      setError(err.message || "加载失败");
    } finally { setLoading(false); }
  }, [page, keyword]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">学生档案</h1>
          <p className="text-sm text-gray-500 mt-1">管理所有学生档案，查看360°全景信息</p>
        </div>
        <button onClick={openNewForm}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
          <Plus className="w-4 h-4" />新建学生
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="搜索姓名、手机号、微信..." value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), fetchStudents())}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button onClick={() => { setPage(1); fetchStudents(); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
            <RefreshCw className="w-4 h-4" />刷新
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-red-500 text-sm mb-3">加载失败: {error}</p>
            <button onClick={() => fetchStudents()} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
              重新加载
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...
          </div>
        ) : !data || data.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <GraduationCap className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无学生档案</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">姓名</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">联系方式</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">意向</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">归属顾问</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">关联</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">更新时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.list.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => router.push(`/students/${s.id}`)}>
                    <td className="px-4 py-3 font-medium text-gray-900 text-sm">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" />{s.phone || "-"}</div>
                      {s.wechat && <div className="text-xs text-gray-400">微信: {s.wechat}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {s.targetCountry || "-"} {s.targetDegree ? `/ ${s.targetDegree}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_MAP[s.currentStatus || ""]?.color || "bg-gray-100 text-gray-800"}`}>
                        {STATUS_MAP[s.currentStatus || ""]?.label || s.currentStatus || "未知"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{s.assignedTo?.realName || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span title="线索">{s._count.leads}</span>
                        <span title="合同"><FileText className="w-3 h-3" />{s._count.contracts}</span>
                        <span title="申请"><ClipboardCheck className="w-3 h-3" />{s._count.applications}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(s.updatedAt).toLocaleDateString("zh-CN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <span className="text-sm text-gray-500">共 {data.total} 条</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded text-gray-500 hover:bg-gray-200"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">新建学生</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <Field label="姓名 *"><input className={ipt} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="必填" /></Field>
              <Field label="性别">
                <select className={ipt} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="">未填写</option><option value="MALE">男</option><option value="FEMALE">女</option>
                </select>
              </Field>
              <Field label="手机号"><input className={ipt} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="微信"><input className={ipt} value={form.wechat} onChange={(e) => setForm({ ...form, wechat: e.target.value })} /></Field>
              <Field label="邮箱"><input className={ipt} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="国籍"><input className={ipt} value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} /></Field>
              <Field label="意向国家"><input className={ipt} value={form.targetCountry} onChange={(e) => setForm({ ...form, targetCountry: e.target.value })} /></Field>
              <Field label="意向学位"><input className={ipt} value={form.targetDegree} onChange={(e) => setForm({ ...form, targetDegree: e.target.value })} /></Field>
              <Field label="意向专业"><input className={ipt} value={form.targetMajor} onChange={(e) => setForm({ ...form, targetMajor: e.target.value })} /></Field>
              <Field label="当前状态">
                <select className={ipt} value={form.currentStatus} onChange={(e) => setForm({ ...form, currentStatus: e.target.value })}>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="预算(元)"><input className={ipt} type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></Field>
              <div className="col-span-2">
                <Field label="备注"><textarea className={ipt} rows={2} value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></Field>
              </div>
            </div>
            {formError && <div className="px-6 pb-2 text-sm text-red-500">{formError}</div>}
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
              <button onClick={handleCreate} disabled={submitting}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                {submitting ? "保存中..." : "确认新建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ipt = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      {children}
    </div>
  );
}
