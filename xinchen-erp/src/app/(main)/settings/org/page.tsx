"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Plus, Edit2, Trash2, RefreshCw, ChevronRight, Users, UserPlus, X } from "lucide-react";

interface Department {
  id: number;
  name: string;
  code: string;
  parentId: number | null;
  sort: number;
  isActive: boolean;
  children: Department[];
  positions: { id: number; name: string }[];
  _count: { userDepts: number };
}

interface Employee {
  id: number;
  name: string;
  employeeNo: string;
  phone?: string;
  status: string;
  position?: { id: number; name: string } | null;
}

export default function OrganizationPage() {
  const [data, setData] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "", parentId: "", sort: 0 });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // 部门人员管理弹窗
  const [showMembers, setShowMembers] = useState(false);
  const [memberDept, setMemberDept] = useState<Department | null>(null);
  const [deptEmployees, setDeptEmployees] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [addEmployeeId, setAddEmployeeId] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/departments");
      if (!res.ok) {
        console.error("departments fetch error:", res.status);
        throw new Error(`请求失败(${res.status})`);
      }
      const result = await res.json();
      setData(result.list || []);
      setFormError("");
    } catch (e: any) {
      setData([]);
      setFormError("加载部门数据失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleExpand(id: number) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function openNewForm(parentId?: number) {
    setEditing(null);
    setFormData({ name: "", code: "", parentId: parentId ? String(parentId) : "", sort: 0 });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(dept: Department) {
    setEditing(dept);
    setFormData({ name: dept.name, code: dept.code, parentId: dept.parentId ? String(dept.parentId) : "", sort: dept.sort });
    setFormError("");
    setShowForm(true);
  }

  // 打开部门人员管理弹窗
  async function openMembers(dept: Department) {
    setMemberDept(dept);
    setShowMembers(true);
    setAddEmployeeId("");
    setMemberLoading(true);
    try {
      // 获取部门直接成员（UserDepartment 表）
      const memRes = await fetch(`/api/departments/${dept.id}/members`);
      const memData = await memRes.json();
      const members: any[] = memData.list || [];

      // 获取所有员工（用于可添加下拉）
      const allRes = await fetch("/api/employees?pageSize=1000");
      const allData = await allRes.json();
      const allEmpList = allData.list || [];

      // 已加入的 userId 集合
      const memberUserIds = new Set(members.map((m: any) => m.userId));
      // 可添加 = 有 userId 且未加入的员工
      setAllEmployees(allEmpList.filter((e: any) => e.userId && !memberUserIds.has(e.userId)));
      // 部门已有成员
      setDeptEmployees(members.map((m: any) => ({
        id: m.employeeId || 0,
        userId: m.userId,
        name: m.realName,
        employeeNo: m.employeeNo,
        position: { name: m.positionName },
      })));
    } catch {
      setFormError("加载人员失败");
    } finally {
      setMemberLoading(false);
    }
  }

  // 添加员工到部门
  async function addEmployeeToDept() {
    if (!addEmployeeId || !memberDept) return;
    try {
      const emp = allEmployees.find((e: any) => String(e.id) === addEmployeeId);
      if (!emp?.userId) { alert("该员工尚未绑定系统账号"); return; }
      const res = await fetch(`/api/departments/${memberDept.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: emp.userId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "添加失败");
        return;
      }
      setAddEmployeeId("");
      openMembers(memberDept);
      fetchData();
    } catch {
      alert("添加失败，请重试");
    }
  }

  // 从部门移除员工
  async function removeEmployeeFromDept(emp: any) {
    if (!memberDept) return;
    if (!emp.userId) {
      alert(`「${emp.name}」尚未绑定系统登录账号，无法从部门移除。请在员工管理中先创建登录账号。`);
      return;
    }
    if (!confirm(`确定将 ${emp.name} 从该部门移除吗？`)) return;
    try {
      const res = await fetch(`/api/departments/${memberDept.id}/members?userId=${emp.userId}`, { method: "DELETE" });
      if (!res.ok) { alert("移除失败"); return; }
      openMembers(memberDept);
      fetchData();
    } catch {
      alert("移除失败，请重试");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const url = editing ? `/api/departments/${editing.id}` : "/api/departments";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, parentId: formData.parentId ? parseInt(formData.parentId) : null, sort: parseInt(String(formData.sort)) || 0 }),
      });
      if (!res.ok) {
        const d = await res.json();
        setFormError(d.error || "操作失败");
        return;
      }
      setShowForm(false);
      fetchData();
    } catch {
      setFormError("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("确定删除此部门？")) return;
    try {
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "删除失败");
        return;
      }
      fetchData();
    } catch {
      alert("网络错误");
    }
  }

  function renderDept(dept: Department, level: number = 0) {
    const isExpanded = expanded.has(dept.id);
    const hasChildren = dept.children && dept.children.length > 0;
    return (
      <div key={dept.id}>
        <div className="flex items-center py-3 px-4 hover:bg-gray-50 transition" style={{ paddingLeft: `${level * 24 + 16}px` }}>
          {hasChildren ? (
            <button onClick={() => toggleExpand(dept.id)} className="mr-2 text-gray-400 hover:text-gray-600">
              <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            </button>
          ) : (
            <span className="w-6 mr-2" />
          )}
          <Building2 className="w-5 h-5 text-blue-500 mr-3" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{dept.name}</span>
              <span className="text-xs text-gray-400">{dept.code}</span>
              {!dept.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">已停用</span>}
            </div>
          </div>
          <span className="text-sm text-gray-400 mr-4 flex items-center gap-1">
            <Users className="w-4 h-4" />{dept._count?.userDepts || 0}人
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => openMembers(dept)} className="text-green-600 hover:bg-green-50 p-1.5 rounded" title="管理部门人员">
              <UserPlus className="w-4 h-4" />
            </button>
            <button onClick={() => openEditForm(dept)} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded" title="编辑部门">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(dept.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded" title="删除部门">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && dept.children.map((c) => renderDept(c, level + 1))}
      </div>
    );
  }

  function flattenDepts(depts: Department[], prefix: string = ""): { id: number; label: string }[] {
    const result: { id: number; label: string }[] = [];
    depts.forEach((d) => {
      result.push({ id: d.id, label: prefix + d.name });
      if (d.children) result.push(...flattenDepts(d.children, prefix + d.name + " / "));
    });
    return result;
  }
  const allDepts = flattenDepts(data);

  // 可添加的员工（不在当前部门中的）
  const availableEmployees = allEmployees.filter(
    (e) => !deptEmployees.find((de) => de.id === e.id)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">组织架构</h1>
          <p className="text-sm text-gray-500 mt-1">管理部门组织结构和人员分配</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />刷新
          </button>
          <button onClick={() => openNewForm()} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />新建部门
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        {loading ? (
          <div className="p-16 text-center text-gray-400">加载中...</div>
        ) : formError ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Building2 className="w-16 h-16 mb-4 text-red-200" />
            <p className="text-sm text-red-500 mb-4">{formError}</p>
            <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <RefreshCw className="w-4 h-4" />重试加载
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Building2 className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-sm mb-4">暂无部门数据，请创建第一个部门</p>
            <button onClick={() => openNewForm()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4" />新建部门
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">{data.map((d) => renderDept(d))}</div>
        )}
      </div>

      {/* 部门编辑/新建表单 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing ? "编辑部门" : "新建部门"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">部门名称 *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">部门编码 *</label>
                <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required disabled={!!editing} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">上级部门</label>
                <select value={formData.parentId} onChange={(e) => setFormData({ ...formData, parentId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">无（顶级部门）</option>
                  {allDepts.filter((d) => d.id !== editing?.id).map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                <input type="number" value={formData.sort} onChange={(e) => setFormData({ ...formData, sort: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? "保存中..." : "保存"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 部门人员管理弹窗 */}
      {showMembers && memberDept && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowMembers(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">{memberDept.name} - 人员管理</h2>
              </div>
              <button onClick={() => setShowMembers(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">✕</button>
            </div>
            <div className="p-6">
              {/* 添加员工 */}
              <div className="flex gap-2 mb-4">
                <select
                  value={addEmployeeId}
                  onChange={(e) => setAddEmployeeId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">选择要添加的员工...</option>
                  {availableEmployees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.employeeNo})</option>
                  ))}
                </select>
                <button
                  onClick={addEmployeeToDept}
                  disabled={!addEmployeeId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  添加
                </button>
              </div>

              {/* 部门员工列表 */}
              {memberLoading ? (
                <div className="py-8 text-center text-gray-400">加载中...</div>
              ) : deptEmployees.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">该部门暂无人员</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">姓名</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">工号</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">岗位</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deptEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{emp.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 font-mono">{emp.employeeNo}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{emp.position?.name || "-"}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => removeEmployeeFromDept(emp)}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                            title="从部门移除"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-4 text-xs text-gray-400">
                提示：添加员工到部门时会自动分配该部门的默认岗位。如需调整具体岗位，请在"员工信息"页面编辑。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
