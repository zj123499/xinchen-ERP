"use client";

import { useState } from "react";
import { Sparkles, Send, FileText } from "lucide-react";

const TYPES = [
  { key: "PS", label: "个人陈述 (PS)" },
  { key: "CV", label: "简历 (CV)" },
  { key: "RECOMMENDATION", label: "推荐信" },
];

export default function AIWritingPage() {
  const [form, setForm] = useState({ type: "PS", studentBackground: "", targetMajor: "", targetInstitution: "", requirements: "" });
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [fallback, setFallback] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setDraft(""); setNote("");
    try {
      const res = await fetch("/api/ai/writing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await res.json();
      setDraft(d.draft || ""); setNote(d.note || ""); setFallback(!!d.fallback);
    } catch { setDraft("请求失败"); } finally { setLoading(false); }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Sparkles className="w-6 h-6 text-blue-600" /> AI 文书助手</h1>
        <p className="text-sm text-gray-500 mt-1">辅助文书老师梳理写作大纲与框架（不直接代写整篇）</p></div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex gap-2">
          {TYPES.map((t) => <button key={t.key} onClick={() => setForm({ ...form, type: t.key })} className={`px-4 py-2 rounded-lg text-sm font-medium border ${form.type === t.key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}>{t.label}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">学生背景</label><textarea value={form.studentBackground} onChange={(e) => setForm({ ...form, studentBackground: e.target.value })} rows={3} placeholder="本科专业、GPA、科研/实习经历" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" /></div>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">目标专业</label><input value={form.targetMajor} onChange={(e) => setForm({ ...form, targetMajor: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">目标院校</label><input value={form.targetInstitution} onChange={(e) => setForm({ ...form, targetInstitution: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          </div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">院校/项目要求</label><textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} rows={2} placeholder="字数、侧重点、特殊要求" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" /></div>
        <button onClick={handleSubmit} disabled={loading} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60">
          <Send className="w-4 h-4" /> {loading ? "生成中..." : "生成大纲"}</button>
      </div>

      {(draft || loading) && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3"><FileText className="w-5 h-5 text-blue-600" /><h2 className="font-semibold text-gray-900">生成结果</h2></div>
          {fallback && note && <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">{note}</div>}
          {loading && !draft ? <div className="flex items-center text-gray-400"><Sparkles className="w-5 h-5 animate-pulse mr-2" />AI 正在生成...</div>
            : <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">{draft}</pre>}
        </div>
      )}
    </div>
  );
}
