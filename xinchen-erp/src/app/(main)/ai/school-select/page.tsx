"use client";

import { useState, useEffect } from "react";
import { Sparkles, Send, GraduationCap, Target, Shield, Save, History, User } from "lucide-react";

interface StudentOpt { id: number; name: string; targetCountry?: string | null; targetMajor?: string | null; }
interface HistoryItem { id: number; title: string; createdAt: string; isFallback: boolean; output: any; }

export default function AISchoolSelectPage() {
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [studentId, setStudentId] = useState<number | "">("");
  const [studentKeyword, setStudentKeyword] = useState("");
  const [form, setForm] = useState({ gpa: "", ielts: "", toefl: "", budget: "", targetCountry: "", targetDegree: "", targetMajor: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<{ fallback?: boolean; profile: string; recommendation?: any; strategy: string; id?: number } | null>(null);
  const [histories, setHistories] = useState<HistoryItem[]>([]);

  useEffect(() => {
    fetch("/api/students?pageSize=50").then((r) => r.json()).then((d) => setStudents(d.data || [])).catch(() => {});
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const r = await fetch("/api/ai/school-select");
      const d = await r.json();
      setHistories(Array.isArray(d) ? d : []);
    } catch {}
  }

  async function onPickStudent(id: number) {
    setStudentId(id);
    const s = students.find((x) => x.id === id);
    if (s) setForm((f) => ({ ...f, targetCountry: s.targetCountry || f.targetCountry, targetMajor: s.targetMajor || f.targetMajor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setResult(null); setSaved(false);
    try {
      const res = await fetch("/api/ai/school-select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: studentId || undefined, ...form }),
      });
      const d = await res.json();
      setResult(d);
    } catch { setResult({ profile: "", strategy: "请求失败", recommendation: null }); } finally { setLoading(false); }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ai/school-select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: studentId || undefined, save: true, ...form }),
      });
      const d = await res.json();
      setResult((r) => (r ? { ...r, id: d.id } : r));
      setSaved(true);
      loadHistory();
    } catch {} finally { setSaving(false); }
  }

  function viewHistory(h: HistoryItem) {
    const o = h.output || {};
    setResult({ profile: `历史方案：${h.title}`, recommendation: o.recommendation, strategy: o.strategy || "", fallback: h.isFallback, id: h.id });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Sparkles className="w-6 h-6 text-blue-600" /> AI 选校顾问</h1>
        <p className="text-sm text-gray-500 mt-1">基于院校数据库智能匹配冲刺 / 匹配 / 保底三档院校，可关联学生并保存方案</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><User className="w-4 h-4" /> 关联学生（选填，自动预填背景）</label>
            <select value={studentId} onChange={(e) => onPickStudent(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">不关联</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.targetCountry ? `（${s.targetCountry}）` : ""}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">GPA</label><input value={form.gpa} onChange={(e) => setForm({ ...form, gpa: e.target.value })} placeholder="3.5" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">雅思</label><input value={form.ielts} onChange={(e) => setForm({ ...form, ielts: e.target.value })} placeholder="6.5" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">托福</label><input value={form.toefl} onChange={(e) => setForm({ ...form, toefl: e.target.value })} placeholder="95" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">预算(万)</label><input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="30" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1"><label className="block text-sm font-medium text-gray-700 mb-1">目标国家</label><input value={form.targetCountry} onChange={(e) => setForm({ ...form, targetCountry: e.target.value })} placeholder="英国" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div className="col-span-1"><label className="block text-sm font-medium text-gray-700 mb-1">目标学位</label><input value={form.targetDegree} onChange={(e) => setForm({ ...form, targetDegree: e.target.value })} placeholder="硕士" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div className="col-span-1"><label className="block text-sm font-medium text-gray-700 mb-1">目标专业</label><input value={form.targetMajor} onChange={(e) => setForm({ ...form, targetMajor: e.target.value })} placeholder="计算机" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60">
              <Send className="w-4 h-4" /> {loading ? "分析中..." : "生成选校方案"}</button>
            <button type="button" onClick={handleSave} disabled={!result || saving} className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-60">
              <Save className="w-4 h-4" /> {saving ? "保存中" : saved ? "已保存" : "保存方案"}</button>
          </div>
        </form>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
          {!result && !loading && <div className="h-full flex flex-col items-center justify-center text-gray-400"><GraduationCap className="w-12 h-12 mb-3 text-gray-300" /><p className="text-sm">填写左侧学生背景，获取 AI 选校方案</p></div>}
          {loading && <div className="h-full flex items-center justify-center text-gray-400"><Sparkles className="w-5 h-5 animate-pulse mr-2" />AI 正在分析院校库...</div>}
          {result && (
            <div className="space-y-4">
              {result.fallback && <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">未配置 AI Key，已返回基于排名的院校分档</div>}
              {result.recommendation && (
                <div className="space-y-3">
                  {[{ key: "reach", label: "冲刺院校", icon: Target, color: "text-red-600" },
                    { key: "match", label: "匹配院校", icon: GraduationCap, color: "text-blue-600" },
                    { key: "safety", label: "保底院校", icon: Shield, color: "text-green-600" }].map(({ key, label, icon: Icon, color }) => (
                    <div key={key}>
                      <div className={`flex items-center gap-1.5 text-sm font-semibold ${color} mb-1`}><Icon className="w-4 h-4" /> {label}</div>
                      <div className="space-y-1">
                        {(result.recommendation[key] || []).map((s: any, i: number) => (
                          <div key={i} className="text-xs bg-gray-50 rounded px-2.5 py-1.5 flex justify-between">
                            <span className="font-medium text-gray-800">{s.name} <span className="text-gray-400">({s.country})</span></span>
                            <span className="text-gray-500">#{s.ranking || "-"}</span>
                          </div>))}
                        {(result.recommendation[key] || []).length === 0 && <div className="text-xs text-gray-400">暂无候选</div>}
                      </div>
                    </div>))}
                </div>
              )}
              <div className="border-t pt-3"><p className="text-sm font-medium text-gray-700 mb-1">选校策略</p><p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{result.strategy}</p></div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-3"><History className="w-5 h-5 text-blue-600" /><h2 className="font-semibold text-gray-900">历史选校方案</h2></div>
        {histories.length === 0 ? <div className="text-sm text-gray-400">暂无保存的方案</div> : (
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
