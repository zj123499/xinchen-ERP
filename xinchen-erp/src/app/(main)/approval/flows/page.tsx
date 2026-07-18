"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, GitBranch } from "lucide-react";

interface FlowNode { nodeType: string; name: string; approverRole: string; approverId: string; orderNo?: number; }
interface FlowItem {
  id: number;
  name: string;
  businessType: string;
  description: string | null;
  signMode: string;
  enabled: boolean;
  nodes: (FlowNode & { id: number; approver: { realName: string } | null })[];
  _count: { records: number };
}

const BT_LABELS: Record<string, string> = {
  CONTRACT_DISCOUNT: "合同优惠审批", REFUND: "退费审批", REIMBURSEMENT: "报销审批", LEAD_TRANSFER: "线索划转审批",
};

export default function ApprovalFlowsPage() {
  const [data, setData] = useState<FlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", businessType: "CONTRACT_DISCOUNT", description: "", signMode: "AND", nodes: [{ nodeType: "APPROVE", name: "", approverRole: "", approverId: "" }] as FlowNode[] });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<FlowItem | null>(null);

  function fetchData() {
    setLoading(true);
    fetch("/api/approval-flows").then((r) => r.json()).then((d) => setData(d.list || [])).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { fetchData(); }, []);

  function updateNode(idx: number, key: keyof FlowNode, value: string) {
    setForm((f) => { const nodes = [...f.nodes]; nodes[idx] = { ...nodes[idx], [key]: value }; return { ...f, nodes }; });
  }
  function addNode() {
    setForm((f) => ({ ...f, nodes: [...f.nodes, { nodeType: "APPROVE", name: "", approverRole: "", approverId: "" }] }));
  }
  function removeNode(idx: number) {
    setForm((f) => ({ ...f, nodes: f.nodes.filter((_, i) => i !== idx) }));
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setFormError("");
    if (!form.name) { setFormError("审批流名称为必填项"); setSubmitting(false); return; }
    if (form.nodes.some((n) => !n.name)) { setFormError("每个审批节点都需要名称"); setSubmitting(false); return; }
    try {
      const res = await fetch("/api/approval-flows", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) { setFormError(result.error || "保存失败"); return; }
      setShowForm(false); fetchData();
    } catch { setFormError("网络错误"); } finally { setSubmitting(false); }
  }
  async function toggleEnabled(f: FlowItem) {
    await fetch(`/api/approval-flows/${f.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !f.enabled }) });
    fetchData();
  }
  async function handleDelete() {
    if (!deleteConfirm) return;
    await fetch(`/api/approval-flows/${deleteConfirm.id}`, { method: "DELETE" });
    setDeleteConfirm(null); fetchData();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">审批流配置</h1>
          <p className="text-sm text-gray-500 mt-1">可配置多级审批（独立于工作流），支持会签/或签</p></div>
        <button onClick={() => { setFormError(""); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> 新增审批流</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
          : data.length === 0 ? <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <GitBranch className="w-12 h-12 mb-3 text-gray-300" /><p className="text-sm">暂无审批流</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-blue-600 text-sm hover:underline">配置第一个审批流</button></div>
            : <table className="w-full"><thead><tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">名称</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">业务类型</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">签批方式</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">节点</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">审批数</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr></thead><tbody className="divide-y divide-gray-100">
              {data.map((f) => <tr key={f.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{f.name}</td>
                <td className="px-4 py-3 text-gray-600">{BT_LABELS[f.businessType] || f.businessType}</td>
                <td className="px-4 py-3 text-gray-600">{f.signMode === "AND" ? "会签" : "或签"}</td>
                <td className="px-4 py-3 text-gray-600">{f.nodes.length} 个</td>
                <td className="px-4 py-3 text-gray-600">{f._count.records}</td>
                <td className="px-4 py-3"><button onClick={() => toggleEnabled(f)} className={`text-xs px-2 py-0.5 rounded-full ${f.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{f.enabled ? "启用" : "停用"}</button></td>
                <td className="px-4 py-3"><button onClick={() => setDeleteConfirm(f)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button></td>
              </tr>)}
            </tbody></table>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">新增审批流</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">✕</button></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">名称 <span className="text-red-500">*</span></label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">业务类型</label>
                  <select value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {Object.entries(BT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">签批方式</label>
                  <select value={form.signMode} onChange={(e) => setForm({ ...form, signMode: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="AND">会签（全部通过）</option><option value="OR">或签（任一通过）</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><label className="text-sm font-medium text-gray-700">审批节点</label>
                  <button type="button" onClick={addNode} className="text-sm text-blue-600 hover:underline">+ 添加节点</button></div>
                <div className="space-y-2">
                  {form.nodes.map((n, idx) => (
                    <div key={idx} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
                      <span className="text-xs text-gray-400 w-6">{idx + 1}</span>
                      <input value={n.name} onChange={(e) => updateNode(idx, "name", e.target.value)} placeholder="节点名称" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      <input value={n.approverRole} onChange={(e) => updateNode(idx, "approverRole", e.target.value)} placeholder="审批角色(可选)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      <button type="button" onClick={() => removeNode(idx)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? "保存中..." : "保存"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-xl"><h2 className="text-lg font-semibold text-red-800">确认删除</h2></div>
            <div className="p-6"><p className="text-sm text-gray-700">确定删除审批流 <strong>{deleteConfirm.name}</strong>？</p>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                <button onClick={handleDelete} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">确认删除</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
}
