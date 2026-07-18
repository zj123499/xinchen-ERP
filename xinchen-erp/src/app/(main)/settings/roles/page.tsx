"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Plus, Edit2, Trash2, RefreshCw, Users, Lock, UserPlus, X, SlidersHorizontal, Check } from "lucide-react";

interface Role {
  id: number;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  _count: { userRoles: number; roleMenus: number };
}

interface UserItem {
  id: number;
  username: string;
  realName: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  userRoleId?: number;
}

export default function RolesPage() {
  const [data, setData] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "", description: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 成员管理
  const [showMembers, setShowMembers] = useState(false);
  const [memberRole, setMemberRole] = useState<Role | null>(null);
  const [roleUsers, setRoleUsers] = useState<UserItem[]>([]);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [addUserId, setAddUserId] = useState("");

  // 权限配置弹窗状态
  const [showAccess, setShowAccess] = useState(false);
  const [accessRole, setAccessRole] = useState<Role | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [allMenus, setAllMenus] = useState<any[]>([]);
  const [allPerms, setAllPerms] = useState<any[]>([]);
  const [checkedMenus, setCheckedMenus] = useState<Set<number>>(new Set());
  const [checkedPerms, setCheckedPerms] = useState<Set<number>>(new Set());
  const [savingAccess, setSavingAccess] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/roles");
      if (!res.ok) throw new Error();
      const result = await res.json();
      setData(result.list || []);
    } catch {
      setFormError("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openNewForm() {
    setEditing(null);
    setFormData({ name: "", code: "", description: "" });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(role: Role) {
    setEditing(role);
    setFormData({ name: role.name, code: role.code, description: role.description || "" });
    setFormError("");
    setShowForm(true);
  }

  // 打开成员管理
  async function openMembers(role: Role) {
    setMemberRole(role);
    setShowMembers(true);
    setMemberLoading(true);
    setAddUserId("");
    try {
      // 获取该角色的用户
      const membersRes = await fetch(`/api/roles/${role.id}/members`);
      const membersData = await membersRes.json();
      setRoleUsers(membersData.list || []);

      // 获取所有用户（用于添加）
      // 复用 employees API 获取用户列表
      const usersRes = await fetch("/api/employees?pageSize=1000");
      const usersData = await usersRes.json();
      // 转换为用户列表
      const users: UserItem[] = (usersData.list || []).map((e: any) => ({
        id: e.user?.id || e.id,
        username: e.user?.username || e.employeeNo,
        realName: e.user?.realName || e.name,
        phone: e.phone,
        email: e.email,
        isActive: e.status === "active",
      })).filter((u: UserItem) => u.id);
      setAllUsers(users);
    } catch {
      setFormError("加载成员失败");
    } finally {
      setMemberLoading(false);
    }
  }

  async function addUserToRole() {
    if (!addUserId || !memberRole) return;
    try {
      const res = await fetch(`/api/roles/${memberRole.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: parseInt(addUserId) }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "添加失败");
        return;
      }
      setAddUserId("");
      openMembers(memberRole);
      fetchData(); // 刷新用户数
    } catch {
      alert("网络错误");
    }
  }

  async function removeUserFromRole(userId: number) {
    if (!memberRole) return;
    try {
      await fetch(`/api/roles/${memberRole.id}/members?userId=${userId}`, { method: "DELETE" });
      openMembers(memberRole);
      fetchData();
    } catch {
      alert("移除失败");
    }
  }

  // ===== 权限配置（菜单 + 接口） =====
  async function openAccess(role: Role) {
    setAccessRole(role);
    setShowAccess(true);
    setAccessLoading(true);
    try {
      const [mRes, pRes] = await Promise.all([
        fetch(`/api/roles/${role.id}/menus`),
        fetch(`/api/roles/${role.id}/permissions`),
      ]);
      const m = await mRes.json();
      const p = await pRes.json();
      setAllMenus(m.menus || []);
      setCheckedMenus(new Set(m.checked || []));
      setAllPerms(p.permissions || []);
      setCheckedPerms(new Set(p.checked || []));
    } catch {
      alert("加载权限配置失败");
    } finally {
      setAccessLoading(false);
    }
  }

  function toggleMenu(id: number) {
    setCheckedMenus((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function togglePerm(id: number) {
    setCheckedPerms((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function setMenuGroup(ids: number[], on: boolean) {
    setCheckedMenus((prev) => {
      const next = new Set(prev);
      ids.forEach((i) => (on ? next.add(i) : next.delete(i)));
      return next;
    });
  }

  function setPermGroup(ids: number[], on: boolean) {
    setCheckedPerms((prev) => {
      const next = new Set(prev);
      ids.forEach((i) => (on ? next.add(i) : next.delete(i)));
      return next;
    });
  }

  const topMenus = allMenus.filter((m) => !m.parentId);
  const childrenOf = (pid: number) => allMenus.filter((m) => m.parentId === pid);
  const permGroups: Record<string, any[]> = allPerms.reduce((acc: Record<string, any[]>, p: any) => {
    (acc[p.groupName] = acc[p.groupName] || []).push(p);
    return acc;
  }, {});

  async function saveAccess() {
    if (!accessRole) return;
    setSavingAccess(true);
    try {
      const [mRes, pRes] = await Promise.all([
        fetch(`/api/roles/${accessRole.id}/menus`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ menuIds: [...checkedMenus] }),
        }),
        fetch(`/api/roles/${accessRole.id}/permissions`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissionIds: [...checkedPerms] }),
        }),
      ]);
      if (!mRes.ok || !pRes.ok) { alert("保存失败"); return; }
      alert("权限配置已保存");
      setShowAccess(false);
    } catch {
      alert("网络错误");
    } finally {
      setSavingAccess(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const url = editing ? `/api/roles/${editing.id}` : "/api/roles";
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
    if (!confirm("确定删除此角色？")) return;
    try {
      const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); alert(d.error || "删除失败"); return; }
      fetchData();
    } catch { alert("网络错误"); }
  }

  // 可添加的用户（不在当前角色中的）
  const availableUsers = allUsers.filter(
    (u) => !roleUsers.find((ru) => ru.id === u.id)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">角色权限</h1>
          <p className="text-sm text-gray-500 mt-1">管理系统角色和人员分配</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />刷新
          </button>
          <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />新建角色
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-400">加载中...</div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Shield className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-sm mb-4">暂无角色数据</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">角色名称</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">编码</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">描述</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">用户数</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">类型</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-gray-900">{role.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{role.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{role.description || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                      <Users className="w-3.5 h-3.5" />{role._count?.userRoles || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {role.isSystem ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        <Lock className="w-3 h-3" />系统内置
                      </span>
                    ) : (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">自定义</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openMembers(role)} className="text-green-600 hover:bg-green-50 p-1.5 rounded" title="管理成员">
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button onClick={() => openAccess(role)} className="text-purple-600 hover:bg-purple-50 p-1.5 rounded" title="权限配置（菜单 / 接口）">
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEditForm(role)} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded" title="编辑角色">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!role.isSystem && (
                        <button onClick={() => handleDelete(role.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded" title="删除角色">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 角色编辑/新建表单 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing ? "编辑角色" : "新建角色"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色名称 *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色编码 *</label>
                <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required disabled={!!editing} placeholder="如：admin, consultant" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? "保存中..." : "保存"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 成员管理弹窗 */}
      {showMembers && memberRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowMembers(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">{memberRole.name} - 成员管理</h2>
              </div>
              <button onClick={() => setShowMembers(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">✕</button>
            </div>
            <div className="p-6">
              {/* 添加用户 */}
              <div className="flex gap-2 mb-4">
                <select
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">选择要添加的用户...</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.realName || u.username}</option>
                  ))}
                </select>
                <button
                  onClick={addUserToRole}
                  disabled={!addUserId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  添加
                </button>
              </div>

              {/* 角色用户列表 */}
              {memberLoading ? (
                <div className="py-8 text-center text-gray-400">加载中...</div>
              ) : roleUsers.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">该角色暂无成员</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">用户</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">联系方式</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">状态</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {roleUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium text-gray-900">{u.realName || u.username}</div>
                          <div className="text-xs text-gray-400">{u.username}</div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{u.phone || "-"}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {u.isActive ? "启用" : "停用"}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => removeUserFromRole(u.id)}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                            title="从角色移除"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 权限配置弹窗（菜单 + 接口） */}
      {showAccess && accessRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAccess(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900">{accessRole.name} - 权限配置</h2>
              </div>
              <button onClick={() => setShowAccess(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">✕</button>
            </div>

            {accessLoading ? (
              <div className="py-16 text-center text-gray-400">加载中...</div>
            ) : (
              <div className="p-6 overflow-y-auto flex-1 space-y-8">
                {/* 菜单权限（导航可见性） */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800">菜单权限（左侧导航可见性）</h3>
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => setMenuGroup(allMenus.map((m) => m.id), true)} className="px-2 py-1 rounded bg-purple-50 text-purple-600 hover:bg-purple-100">全选</button>
                      <button onClick={() => setMenuGroup(allMenus.map((m) => m.id), false)} className="px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200">清空</button>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {topMenus.map((tm) => {
                      const childIds = childrenOf(tm.id).map((m) => m.id);
                      const allChecked = childIds.length > 0 && childIds.every((id) => checkedMenus.has(id));
                      return (
                        <div key={tm.id} className="px-4 py-3">
                          <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-purple-600"
                              checked={allChecked}
                              onChange={() => setMenuGroup(childIds, !allChecked)}
                            />
                            {tm.name}
                            <span className="text-xs text-gray-400">（{childIds.length} 项）</span>
                          </label>
                          {childIds.length > 0 && (
                            <div className="mt-2 ml-6 grid grid-cols-2 gap-x-4 gap-y-1">
                              {childrenOf(tm.id).map((cm) => (
                                <label key={cm.id} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 accent-purple-600"
                                    checked={checkedMenus.has(cm.id)}
                                    onChange={() => toggleMenu(cm.id)}
                                  />
                                  {cm.name}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 接口(API)权限 */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800">接口 / 操作权限（API）</h3>
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => setPermGroup(allPerms.map((p) => p.id), true)} className="px-2 py-1 rounded bg-purple-50 text-purple-600 hover:bg-purple-100">全选</button>
                      <button onClick={() => setPermGroup(allPerms.map((p) => p.id), false)} className="px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200">清空</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {Object.keys(permGroups).map((g) => {
                      const gIds = permGroups[g].map((p: any) => p.id);
                      const gAll = gIds.length > 0 && gIds.every((id) => checkedPerms.has(id));
                      return (
                        <div key={g} className="border border-gray-200 rounded-lg p-3">
                          <label className="flex items-center gap-2 font-medium text-gray-800 cursor-pointer mb-2">
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-purple-600"
                              checked={gAll}
                              onChange={() => setPermGroup(gIds, !gAll)}
                            />
                            {g}
                          </label>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {permGroups[g].map((p: any) => (
                              <label key={p.id} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 accent-purple-600"
                                  checked={checkedPerms.has(p.id)}
                                  onChange={() => togglePerm(p.id)}
                                />
                                <span>{p.name}</span>
                                <code className="text-[10px] text-gray-400">{p.code}</code>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowAccess(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button
                onClick={saveAccess}
                disabled={savingAccess || accessLoading}
                className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
              >
                {savingAccess ? "保存中..." : "保存权限"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
