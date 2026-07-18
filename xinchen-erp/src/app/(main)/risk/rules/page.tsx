"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, AlertCircle, Power } from "lucide-react";

interface RuleItem { id: number; name: string; description: string | null; conditionExpr: string; riskLevel: string; notifyRoles: string | null; enabled: boolean; _count: { records: number }; createdAt: string; }

const LEVEL_META: Record<string, { label: string; color: string }> = {
  HIGH: { label: "高", color: "bg-red-100 text-red-700" },
  MEDIUM: { label: "中", color: "bg-orange-100 text-orange-700" },
  LOW: { label: "低", color: "bg-yellow-100 text-yellow-700" },
};

const TEMPLATES = [
  { name: "交付临近截止未达标", conditionExpr: "daysToDeadline < 7 AND materialCompletion < 0.8", riskLevel: "HIGH", description: "距离交付截止不足7天且材料完成度低于80%触发高危预警" },
  { name: "回访连续出现风险", conditionExpr: "visitRiskCount >= 2", riskLevel: "MEDIUM", description: "连续两次回访标记风险" },
  { name: "满意度评分过低", conditionExpr: "nps <= 6", riskLevel: "MEDIUM", description: "净推荐值≤6分视为不满意" },
  { name: "投诉未及时处理", conditionExpr: "complaintOpenDays > 3", riskLevel: "HIGH", description: "投诉超过3天未处理升级高危" },
];

export default function RiskRulesPage() {
  const [data, setData] = useState<RuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", conditionExpr: "", riskLevel: "MEDIUM", notifyRoles: "", enabled: true });
  const [formError, setFormError] = useState("");

  function fetchData() {
    setLoading(true);
    fetch("/api/risk-rules").then((r) => r.json()).then((d) => setData(d.list || [])).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { fetchData(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setFormError("");
    if (!form.name || !form.conditionExpr) { setFormError("规则名称与条件表达式为必填项"); return; }
    const res = await fetch("/api/risk-rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { const r = await res.json(); setFormError(r.error || "失败"); return; }
    setShowForm(false); setForm({ name: "", description: "", conditionExpr: "", riskLevel: "MEDIUM", notifyRoles: "", enabled: true }); fetchData();
  }
  function applyTemplate(t: typeof TEMPLATES[number]) { setForm({ ...form, name: t.name, description: t.description || "", conditionExpr: t.conditionExpr, riskLevel: t.riskLevel }); }
  async function toggle(id: number, enabled: boolean) {
    await fetch(`/api/risk-rules/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !enabled }) });
    fetchData();
  }
  async function handleDelete(id: number) { await fetch(`/api/risk-rules/${id}`, { method: "DELETE" }); fetchData(); }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">风险规则</h1><p className="text-sm text-gray-500 mt-1">配置条件表达式，由风险扫描引擎自动判定</p></div>
        <button onClick={() => { setFormError(""); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> 新增规则</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
          : data.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-gray-400"><AlertCircle className="w-12 h-12 mb-3 text-gray-300" /><p className="text-sm">暂无规则</p></div>
            : <table className="w-full"><thead><tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">规则名称</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">等级</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">条件表达式</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">触发次数</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr></thead><tbody className="divide-y divide-gray-100">
              {data.map((r) => <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><div className="font-medium text-gray-900">{r.name}</div><div className="text-xs text-gray-400">{r.description || "-"}</div></td>
                <td className="px-4 py-3"><span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${LEVEL_META[r.riskLevel]?.color}`}>{LEVEL_META[r.riskLevel]?.label}</span></td>
                <td className="px-4 py-3"><code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">{r.conditionExpr}</code></td>
                <td className="px-4 py-3 text-gray-600">{r._count.records}</td>
                <td className="px-4 py-3">{r.enabled ? <span className="text-green-600 text-sm font-medium">启用</span> : <span className="text-gray-400 text-sm">停用</span>}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-1">
                  <button onClick={() => toggle(r.id, r.enabled)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title={r.enabled ? "停用" : "启用"}><Power className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>)}
            </tbody></table>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between"><h2 className="text-lg font-semibold">新增风险规则</h2><button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">规则名称 <span className="text-red-500">*</span></label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">风险等级</label>
                  <select value={form.riskLevel} onChange={(e) => setForm({ ...form, riskLevel: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="HIGH">高</option><option value="MEDIUM">中</option><option value="LOW">低</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">条件表达式 <span className="text-red-500">*</span></label>
                <textarea required value={form.conditionExpr} onChange={(e) => setForm({ ...form, conditionExpr: e.target.value })} rows={2} placeholder="例如：daysToDeadline < 7 AND materialCompletion < 0.8" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">说明</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">通知角色</label>
                <input value={form.notifyRoles} onChange={(e) => setForm({ ...form, notifyRoles: e.target.value })} placeholder="多个角色用逗号分隔" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-2">快捷模板：</p>
                <div className="flex flex-wrap gap-2">{TEMPLATES.map((t) => <button key={t.name} type="button" onClick={() => applyTemplate(t)} className="px-2.5 py-1 text-xs bg-white border border-gray-300 rounded-full hover:bg-blue-50 hover:border-blue-300">{t.name}</button>)}</div>
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button><button type="submit" className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">提交</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
