"use client";

import { useState, useEffect } from "react";
import { Sparkles, Send, FileText, Save, History, User, Link2 } from "lucide-react";

const TYPES = [
  { key: "PS", label: "个人陈述 (PS)" },
  { key: "CV", label: "简历 (CV)" },
  { key: "RECOMMENDATION", label: "推荐信" },
];

interface StudentOpt { id: number; name: string; }
interface TaskOpt { id: number; taskType: string; status: string; application?: { student?: { name: string } } }
interface HistoryItem { id: number; title: string; createdAt: string; isFallback: boolean; output: any }

export default function AIWritingPage() {
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [studentId, setStudentId] = useState<number | "">("");
  const [tasks, setTasks] = useState<TaskOpt[]>([]);
  const [relatedId, setRelatedId] = useState<number | "">("");
  const [form, setForm] = useState({ type: "PS", studentBackground: "", targetMajor: "", targetInstitution: "", requirements: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [fallback, setFallback] = useState(false);
  const [histories, setHistories] = useState<HistoryItem[]>([]);

  useEffect(() => {
    fetch("/api/students?pageSize=50").then((r) => r.json()).then((d) => setStudents(d.data || [])).catch(() => {});
    fetch("/api/copywriter-tasks?pageSize=50").then((r) => r.json()).then((d) => setTasks(d.data || d || [])).catch(() => {});
    loadHistory();
  }, []);

  async function loadHistory() {
    try { const r = await fetch("/api/ai/writing"); const d = await r.json(); setHistories(Array.isArray(d) ? d : []); } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setDraft(""); setNote(""); setSaved(false);
    try {
      const res = await fetch("/api/ai/writing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: studentId || undefined, relatedId: relatedId || undefined, ...form }),
      });
      const d = await res.json();
      setDraft(d.draft || ""); setNote(d.note || ""); setFallback(!!d.fallback);
    } catch { setDraft("请求失败"); } finally { setLoading(false); }
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ai/writing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: studentId || undefined, relatedId: relatedId || undefined, save: true, ...form }),
      });
      const d = await res.json();
      setSaved(true);
      loadHistory();
    } catch {} finally { setSaving(false); }
  }

  function viewHistory(h: HistoryItem) {
    const o = h.output || {};
    setDraft(o.draft || ""); setFallback(h.isFallback); setNote(h.isFallback ? "历史草稿（模板模式）" : "");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Sparkles className="w-6 h-6 text-blue-600" /> AI 文书助手</h1>
        <p className="text-sm text-gray-500 mt-1">辅助文书老师梳理写作大纲与框架（不直接代写整篇），可关联学生与文书任务并保存</p></div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex gap-2">
          {TYPES.map((t) => <button key={t.key} onClick={() => setForm({ ...form, type: t.key })} className={`px-4 py-2 rounded-lg text-sm font-medium border ${form.type === t.key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}>{t.label}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><User className="w-4 h-4" /> 关联学生</label>
            <select value={studentId} onChange={(e) => setStudentId(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">不关联</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Link2 className="w-4 h-4" /> 关联文书任务</label>
            <select value={relatedId} onChange={(e) => setRelatedId(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">不关联</option>{tasks.map((t) => <option key={t.id} value={t.id}>#{t.id} {t.taskType}（{t.application?.student?.name || "学生"}）</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">学生背景</label><textarea value={form.studentBackground} onChange={(e) => setForm({ ...form, studentBackground: e.target.value })} rows={3} placeholder="本科专业、GPA、科研/实习经历" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" /></div>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">目标专业</label><input value={form.targetMajor} onChange={(e) => setForm({ ...form, targetMajor: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">目标院校</label><input value={form.targetInstitution} onChange={(e) => setForm({ ...form, targetInstitution: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          </div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">院校/项目要求</label><textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} rows={2} placeholder="字数、侧重点、特殊要求" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" /></div>
        <div className="flex gap-2">
          <button onClick={handleSubmit} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60">
            <Send className="w-4 h-4" /> {loading ? "生成中..." : "生成大纲"}</button>
          <button onClick={handleSave} disabled={!draft || saving} className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? "保存中" : saved ? "已保存" : "保存草稿"}</button>
        </div>
      </div>

      {(draft || loading) && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3"><FileText className="w-5 h-5 text-blue-600" /><h2 className="font-semibold text-gray-900">生成结果</h2></div>
          {fallback && note && <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">{note}</div>}
          {loading && !draft ? <div className="flex items-center text-gray-400"><Sparkles className="w-5 h-5 animate-pulse mr-2" />AI 正在生成...</div>
            : <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">{draft}</pre>}
          {relatedId && saved && <div className="mt-2 text-xs text-emerald-600">已同步写入关联文书任务 #{relatedId} 的内容</div>}
        </div>
      )}

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-3"><History className="w-5 h-5 text-blue-600" /><h2 className="font-semibold text-gray-900">历史文书草稿</h2></div>
        {histories.length === 0 ? <div className="text-sm text-gray-400">暂无保存的草稿</div> : (
          <div className="space-y-2">
            {histories.map((h) => (
              <button key={h.id} onClick={() => viewHistory(h)} className="w-full text-left px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 flex justify-between items-center">
                <span className="text-sm text-gray-800">{h.title}</span>
                <span className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleString("zh-CN")}</span>
              </button>))}
          </div>
        )}
      </div>
    </div>
  );
}
