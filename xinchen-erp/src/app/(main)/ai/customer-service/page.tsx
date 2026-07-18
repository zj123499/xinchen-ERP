"use client";

import { useState } from "react";
import { Sparkles, Send, MessageCircle, UserCheck } from "lucide-react";

interface Msg { role: "user" | "ai"; content: string; needHuman?: boolean; fallback?: boolean; }

export default function AICustomerServicePage() {
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question;
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setQuestion(""); setLoading(true);
    try {
      const res = await fetch("/api/ai/customer-service", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, context }) });
      const d = await res.json();
      setMsgs((m) => [...m, { role: "ai", content: d.answer || "", needHuman: d.needHuman, fallback: d.fallback }]);
    } catch { setMsgs((m) => [...m, { role: "ai", content: "请求失败" }]); } finally { setLoading(false); }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Sparkles className="w-6 h-6 text-blue-600" /> AI 客服助手</h1>
        <p className="text-sm text-gray-500 mt-1">自动应答家长常见问题，复杂问题智能转人工</p></div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[520px] flex flex-col">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {msgs.length === 0 && <div className="h-full flex flex-col items-center justify-center text-gray-400"><MessageCircle className="w-12 h-12 mb-3 text-gray-300" /><p className="text-sm">输入家长常见问题开始对话</p></div>}
          {msgs.map((m, i) => m.role === "user" ? (
            <div key={i} className="flex justify-end"><div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm">{m.content}</div></div>
          ) : (
            <div key={i} className="flex justify-start">
              <div className={`max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm ${m.needHuman ? "bg-amber-50 border border-amber-200 text-amber-800" : "bg-gray-100 text-gray-700"}`}>
                {m.fallback && <div className="text-xs text-gray-400 mb-1">（模板模式）</div>}
                {m.content}
                {m.needHuman && <div className="mt-1 flex items-center gap-1 text-xs text-amber-600"><UserCheck className="w-3.5 h-3.5" /> 建议转人工</div>}
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-start"><div className="bg-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-400"><Sparkles className="w-4 h-4 inline animate-pulse" /> 思考中...</div></div>}
        </div>
        <form onSubmit={handleSubmit} className="border-t p-4 space-y-2">
          <input value={context} onChange={(e) => setContext(e.target.value)} placeholder="补充背景（选填，如：学生已签约英国硕士）" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs" />
          <div className="flex gap-2">
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="输入家长问题，回车发送" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <button type="submit" disabled={loading || !question.trim()} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"><Send className="w-4 h-4" />发送</button>
          </div>
        </form>
      </div>
    </div>
  );
}
