"use client";

import { useState, useEffect, useCallback } from "react";
import { Database, Plus, Edit2, Trash2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

interface DictItem {
  id: number;
  groupName: string;
  dictKey: string;
  dictValue: string;
  sort: number;
  isEnabled: boolean;
}

export default function DictsPage() {
  const [data, setData] = useState<DictItem[]>([]);
  const [grouped, setGrouped] = useState<Record<string, DictItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DictItem | null>(null);
  const [formData, setFormData] = useState({ groupName: "", dictKey: "", dictValue: "", sort: 0, isEnabled: true });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dicts");
      if (!res.ok) throw new Error();
      const result = await res.json();
      setData(result.list || []);
      setGrouped(result.grouped || {});
      // 自动展开所有分组
      setExpanded(new Set(Object.keys(result.grouped || {})));
    } catch {
      setFormError("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleGroup(group: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(group) ? n.delete(group) : n.add(group); return n; });
  }

  function openNewForm(groupName?: string) {
    setEditing(null);
    setFormData({ groupName: groupName || "", dictKey: "", dictValue: "", sort: 0, isEnabled: true });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(item: DictItem) {
    setEditing(item);
    setFormData({ groupName: item.groupName, dictKey: item.dictKey, dictValue: item.dictValue, sort: item.sort, isEnabled: item.isEnabled });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const url = editing ? `/api/dicts/${editing.id}` : "/api/dicts";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, sort: parseInt(String(formData.sort)) || 0 }),
      });
      if (!res.ok) { const d = await res.json(); setFormError(d.error || "操作失败"); return; }
      setShowForm(false);
      fetchData();
    } catch { setFormError("网络错误"); } finally { setSubmitting(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("确定删除此字典项？")) return;
    try {
      const res = await fetch(`/api/dicts/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); alert(d.error || "删除失败"); return; }
      fetchData();
    } catch { alert("网络错误"); }
  }

  const groupNames = Object.keys(grouped);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据字典</h1>
          <p className="text-sm text-gray-500 mt-1">管理系统中的枚举值和基础数据字典</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />刷新
          </button>
          <button onClick={() => openNewForm()} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />新建字典
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-400">加载中...</div>
        ) : groupNames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Database className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-sm mb-4">暂无字典数据</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {groupNames.map((group) => {
              const items = grouped[group] || [];
              const isExpanded = expanded.has(group);
              return (
                <div key={group}>
                  <div className="flex items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => toggleGroup(group)}>
                    {isExpanded ? <ChevronDown className="w-4 h-4 mr-2 text-gray-400" /> : <ChevronRight className="w-4 h-4 mr-2 text-gray-400" />}
                    <Database className="w-4 h-4 text-blue-500 mr-2" />
                    <span className="font-medium text-gray-900">{group}</span>
                    <span className="ml-2 text-xs text-gray-400">({items.length})</span>
                    <button onClick={(e) => { e.stopPropagation(); openNewForm(group); }} className="ml-auto text-blue-600 hover:bg-blue-100 p-1.5 rounded">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {isExpanded && (
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-100">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-8 py-2.5 text-sm text-gray-600">{item.dictKey}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-900">{item.dictValue}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-400">排序: {item.sort}</td>
                            <td className="px-4 py-2.5">
                              {item.isEnabled ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">启用</span>
                              ) : (
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">禁用</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <button onClick={() => openEditForm(item)} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded mr-1">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing ? "编辑字典项" : "新建字典项"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">字典分组 *</label>
                <input type="text" value={formData.groupName} onChange={(e) => setFormData({ ...formData, groupName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required list="existing-groups" placeholder="如：lead_source, contract_type" />
                <datalist id="existing-groups">
                  {groupNames.map((g) => <option key={g} value={g} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">字典键 *</label>
                <input type="text" value={formData.dictKey} onChange={(e) => setFormData({ ...formData, dictKey: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required placeholder="如：WALK_IN" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">字典值 *</label>
                <input type="text" value={formData.dictValue} onChange={(e) => setFormData({ ...formData, dictValue: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required placeholder="如：上门咨询" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                  <input type="number" value={formData.sort} onChange={(e) => setFormData({ ...formData, sort: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select value={formData.isEnabled ? "true" : "false"} onChange={(e) => setFormData({ ...formData, isEnabled: e.target.value === "true" })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="true">启用</option>
                    <option value="false">禁用</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? "保存中..." : "保存"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
