"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Database, Plus, Edit2, Trash2, RefreshCw, ChevronDown, ChevronRight, GripVertical, FolderPlus, X } from "lucide-react";

interface DictItem {
  id: number;
  groupName: string;
  dictKey: string;
  dictValue: string;
  sort: number;
  isEnabled: boolean;
}

interface DictGroupItem {
  id: number;
  name: string;
  label?: string | null;
  sort: number;
}

export default function DictsPage() {
  const [data, setData] = useState<DictItem[]>([]);
  const [grouped, setGrouped] = useState<Record<string, DictItem[]>>({});
  const [groups, setGroups] = useState<DictGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DictItem | null>(null);
  const [formData, setFormData] = useState({ groupName: "", dictKey: "", dictValue: "", isEnabled: true });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 新建/编辑分组
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DictGroupItem | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupLabel, setNewGroupLabel] = useState("");

  function getGroupDisplay(name: string) {
    const g = groups.find(gr => gr.name === name);
    return g?.label || name;
  }

  // 拖拽
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragGroup, setDragGroup] = useState("");
  const isInitialLoad = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const scrollTop = containerRef.current?.parentElement?.scrollTop || window.scrollY;
    try {
      const res = await fetch("/api/dicts");
      if (!res.ok) throw new Error();
      const result = await res.json();
      setData(result.list || []);
      setGrouped(result.grouped || {});
      setGroups(result.groups || []);
      // 仅首次加载自动展开全部，后续保留当前展开状态
      if (isInitialLoad.current) {
        setExpanded(new Set(Object.keys(result.grouped || {})));
        isInitialLoad.current = false;
      }
    } catch {
      setFormError("加载失败");
    } finally {
      setLoading(false);
      // 恢复滚动位置
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollTop);
        if (containerRef.current?.parentElement) {
          containerRef.current.parentElement.scrollTop = scrollTop;
        }
      });
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleGroup(group: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(group) ? n.delete(group) : n.add(group); return n; });
  }

  function openNewForm(groupName?: string) {
    setEditing(null);
    setFormData({ groupName: groupName || "", dictKey: "", dictValue: "", isEnabled: true });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(item: DictItem) {
    setEditing(item);
    setFormData({ groupName: item.groupName, dictKey: item.dictKey, dictValue: item.dictValue, isEnabled: item.isEnabled });
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
        body: JSON.stringify(formData),
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

  async function handleDeleteGroup(name: string) {
    if (!confirm(`确定删除分组「${name}」？\n注意：仅可删除无数据的分组。`)) return;
    const g = groups.find(gr => gr.name === name);
    if (!g) return;
    try {
      const res = await fetch(`/api/dicts/groups?id=${g.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); alert(d.error || "删除失败"); return; }
      fetchData();
    } catch { alert("网络错误"); }
  }

  function openGroupForm(group?: DictGroupItem) {
    setEditingGroup(group || null);
    setNewGroupName(group?.name || "");
    setNewGroupLabel(group?.label || "");
    setShowGroupForm(true);
  }

  async function handleSaveGroup() {
    if (!newGroupName.trim()) return;
    try {
      if (editingGroup) {
        const res = await fetch(`/api/dicts/groups?id=${editingGroup.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: newGroupLabel.trim() || null }),
        });
        if (!res.ok) { const d = await res.json(); alert(d.error || "保存失败"); return; }
      } else {
        const res = await fetch("/api/dicts/groups", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newGroupName.trim(), label: newGroupLabel.trim() || newGroupName.trim() }),
        });
        if (!res.ok) { const d = await res.json(); alert(d.error || "创建失败"); return; }
      }
      setNewGroupName("");
      setNewGroupLabel("");
      setShowGroupForm(false);
      fetchData();
    } catch { alert("网络错误"); }
  }

  // 拖拽排序
  function handleDragStart(e: React.DragEvent, index: number, group: string) {
    dragItem.current = index;
    setDragGroup(group);
    (e.target as HTMLElement).classList.add("opacity-50");
  }

  function handleDragEnd(e: React.DragEvent) {
    (e.target as HTMLElement).classList.remove("opacity-50");
    dragItem.current = null;
    dragOverItem.current = null;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    dragOverItem.current = index;
  }

  async function handleDrop(group: string) {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const items = [...(grouped[group] || [])];
    const dragged = items[dragItem.current];
    items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, dragged);

    // 乐观更新
    setGrouped(prev => ({ ...prev, [group]: items }));

    // 提交排序
    const ids = items.map(i => i.id);
    await fetch("/api/dicts/reorder", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch(() => {});
    dragItem.current = null;
    dragOverItem.current = null;
  }

  const groupNames = groups.map(g => g.name).filter(n => grouped[n] !== undefined);

  return (
    <div ref={containerRef}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据字典</h1>
          <p className="text-sm text-gray-500 mt-1">管理系统中的枚举值和基础数据字典，拖拽排序</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openGroupForm()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <FolderPlus className="w-4 h-4" />新建分组
          </button>
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
                    <span className="font-medium text-gray-900">{getGroupDisplay(group)}</span>
                    {getGroupDisplay(group) !== group && <span className="ml-1 text-xs text-gray-400">({group})</span>}
                    <span className="ml-2 text-xs text-gray-400">({items.length})</span>
                    <button onClick={(e) => { e.stopPropagation(); openGroupForm(groups.find(g => g.name === group)); }} className="ml-auto text-gray-400 hover:bg-gray-100 p-1.5 rounded mr-1" title="编辑分组名">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); openNewForm(group); }} className="text-blue-600 hover:bg-blue-100 p-1.5 rounded mr-1" title="添加字典项">
                      <Plus className="w-4 h-4" />
                    </button>
                    {items.length === 0 && (
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group); }} className="text-red-400 hover:bg-red-50 p-1.5 rounded" title="删除空分组">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {isExpanded && (
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-100">
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-8 py-6 text-center text-sm text-gray-400">此分组暂无数据，点击右侧 + 添加</td>
                          </tr>
                        ) : (
                          items.map((item, index) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition"
                              draggable
                              onDragStart={(e) => handleDragStart(e, index, group)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDrop={() => handleDrop(group)}
                            >
                              <td className="px-4 py-2.5 w-8">
                                <GripVertical className="w-4 h-4 text-gray-300 cursor-grab active:cursor-grabbing" />
                              </td>
                              <td className="px-2 py-2.5 text-sm text-gray-600">{item.dictKey}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-900">{item.dictValue}</td>
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
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 新建/编辑表单 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select value={formData.isEnabled ? "true" : "false"} onChange={(e) => setFormData({ ...formData, isEnabled: e.target.value === "true" })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="true">启用</option>
                  <option value="false">禁用</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? "保存中..." : "保存"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新建/编辑分组弹窗 */}
      {showGroupForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editingGroup ? "编辑分组" : "新建字典分组"}</h2>
              <button onClick={() => setShowGroupForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              {!editingGroup && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分组标识（英文）</label>
                  <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="如：lead_source" autoFocus onKeyDown={(e) => e.key === "Enter" && handleSaveGroup()} />
                </div>
              )}
              {editingGroup && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分组标识</label>
                  <input type="text" value={newGroupName} disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-400 bg-gray-50 outline-none" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">显示名称（中文）</label>
                <input type="text" value={newGroupLabel} onChange={(e) => setNewGroupLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="如：线索来源" autoFocus={!!editingGroup} onKeyDown={(e) => e.key === "Enter" && handleSaveGroup()} />
              </div>
              <div className="flex gap-3">
                <button onClick={handleSaveGroup} disabled={editingGroup ? !newGroupLabel.trim() : !newGroupName.trim()}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {editingGroup ? "保存" : "创建"}
                </button>
                <button onClick={() => setShowGroupForm(false)} className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
