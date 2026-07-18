"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, ChevronLeft, ChevronRight, RefreshCw,
  Layers, History, RotateCcw, Trash2, Filter,
} from "lucide-react";

interface CommissionRuleItem {
  id: number;
  name: string;
  version: number;
  ruleType: string;
  config: any;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: boolean;
  configVersionId?: number | null;
  configVersion?: { id: number; version: number; isActive: boolean } | null;
  createdAt: string;
}

interface VersionItem {
  id: number;
  configType: string;
  configKey: string;
  version: number;
  snapshot: any;
  remark?: string | null;
  operatorId?: number | null;
  isActive: boolean;
  createdAt: string;
}

export default function CommissionRulesPage() {
  const [data, setData] = useState<CommissionRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRuleItem | null>(null);
  const [formData, setFormData] = useState({
    name: "", ruleType: "FIXED_RATE", config: "{}", effectiveFrom: "", effectiveTo: "", remark: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [historyRule, setHistoryRule] = useState<CommissionRuleItem | null>(null);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [viewVersion, setViewVersion] = useState<VersionItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter === "active") params.set("status", "active");
      if (statusFilter === "inactive") params.set("status", "inactive");
      const res = await fetch(`/api/commission-rules?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      setData(d.list || []);
    } catch {
      console.error("获取提成规则失败");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openNewForm() {
    setEditingRule(null);
    setFormData({ name: "", ruleType: "FIXED_RATE", config: "{}", effectiveFrom: "", effectiveTo: "", remark: "" });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(r: CommissionRuleItem) {
    setEditingRule(r);
    setFormData({
      name: r.name,
      ruleType: r.ruleType,
      config: JSON.stringify(r.config, null, 2),
      effectiveFrom: r.effectiveFrom ? r.effectiveFrom.slice(0, 10) : "",
      effectiveTo: r.effectiveTo ? r.effectiveTo.slice(0, 10) : "",
      remark: "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    let parsedConfig: any;
    try {
      parsedConfig = JSON.parse(formData.config);
    } catch {
      setFormError("配置内容必须是合法 JSON");
      return;
    }
    if (!formData.name) { setFormError("请填写规则名称"); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        ruleType: formData.ruleType,
        config: parsedConfig,
        effectiveFrom: formData.effectiveFrom || undefined,
        effectiveTo: formData.effectiveTo || undefined,
        remark: formData.remark || undefined,
      };
      const url = editingRule ? `/api/commission-rules/${editingRule.id}` : "/api/commission-rules";
      const method = editingRule ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || "操作失败");
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

  async function openHistory(r: CommissionRuleItem) {
    setHistoryRule(r);
    setLoadingVersions(true);
    setVersions([]);
    try {
      const res = await fetch(`/api/commission-rules/${r.id}`);
      if (res.ok) {
        const d = await res.json();
        setVersions(d.versions || []);
      }
    } catch {
      console.error("获取版本历史失败");
    } finally {
      setLoadingVersions(false);
    }
  }

  async function handleRestore(v: VersionItem) {
    if (!confirm(`确认将规则回滚至 v${v.version} 配置？将生成新版本。`)) return;
    try {
      const res = await fetch(`/api/config-versions/${v.id}/restore`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "回滚失败");
        return;
      }
      setHistoryRule(null);
      setViewVersion(null);
      fetchData();
    } catch {
      alert("回滚失败");
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">提成规则</h1>
          <p className="text-sm text-gray-500 mt-1">配置销售提成规则，每次修改自动生成版本快照，支持历史回溯</p>
        </div>
        <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4" />新增规则
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">全部状态</option>
            <option value="active">启用</option>
            <option value="inactive">停用</option>
          </select>
          <button onClick={() => fetchData()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="刷新"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Layers className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无提成规则</p>
            <button onClick={openNewForm} className="mt-3 text-blue-600 text-sm hover:underline">添加第一条规则</button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">规则名称</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">当前版本</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">生效起始</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{r.name}</div>
                    <div className="text-xs text-gray-400">v{r.version}{r.configVersion?.isActive ? " · 当前生效" : ""}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.ruleType}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">v{r.version}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.effectiveFrom ? new Date(r.effectiveFrom).toLocaleDateString("zh-CN") : "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${r.status ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {r.status ? "启用" : "停用"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditForm(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="编辑（生成新版本）"><Filter className="w-4 h-4" /></button>
                      <button onClick={() => openHistory(r)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition" title="版本历史"><History className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editingRule ? `编辑规则（将生成 v${editingRule.version + 1}）` : "新增提成规则"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">规则名称 <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="如：标准销售提成" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">规则类型</label>
                <select value={formData.ruleType} onChange={(e) => setFormData((d) => ({ ...d, ruleType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="FIXED_RATE">固定比例</option>
                  <option value="TIERED">阶梯提成</option>
                  <option value="MILESTONE">里程碑释放</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">配置内容（JSON） <span className="text-red-500">*</span></label>
                <textarea value={formData.config} onChange={(e) => setFormData((d) => ({ ...d, config: e.target.value }))} rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" placeholder='{"rate": 0.1}' />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">生效起始</label>
                  <input type="date" value={formData.effectiveFrom} onChange={(e) => setFormData((d) => ({ ...d, effectiveFrom: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">生效截止</label>
                  <input type="date" value={formData.effectiveTo} onChange={(e) => setFormData((d) => ({ ...d, effectiveTo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">变更说明</label>
                <input type="text" value={formData.remark} onChange={(e) => setFormData((d) => ({ ...d, remark: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="如：首款比例 20% → 25%" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">取消</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                  {submitting ? "保存中..." : editingRule ? "保存（生成新版本）" : "确认新增"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">版本历史 · {historyRule.name}</h2>
              <button onClick={() => { setHistoryRule(null); setViewVersion(null); }} className="p-1 text-gray-400 hover:text-gray-600 rounded transition">✕</button>
            </div>
            <div className="p-6">
              {loadingVersions ? (
                <div className="flex items-center justify-center py-10 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
              ) : versions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">暂无版本记录</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((v) => (
                    <div key={v.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">v{v.version}</span>
                          {v.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">当前生效</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{v.remark || "无说明"}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(v.createdAt).toLocaleString("zh-CN")}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setViewVersion(v)} className="px-2 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition">查看</button>
                        {!v.isActive && (
                          <button onClick={() => handleRestore(v)} className="px-2 py-1 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 rounded transition flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" />回滚
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewVersion && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">配置快照 · v{viewVersion.version}</h2>
              <button onClick={() => setViewVersion(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition">✕</button>
            </div>
            <div className="p-6">
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(viewVersion.snapshot, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
