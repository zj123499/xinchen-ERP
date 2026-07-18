"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, Save, RefreshCw, Plus, Trash2, Edit2 } from "lucide-react";

interface ConfigItem {
  id: number;
  configKey: string;
  configValue: any;
  description: string | null;
}

const COMMON_CONFIGS = [
  { key: "company_name", label: "公司名称", type: "text", group: "公司信息" },
  { key: "company_phone", label: "公司电话", type: "text", group: "公司信息" },
  { key: "company_address", label: "公司地址", type: "text", group: "公司信息" },
  { key: "lead_expire_days", label: "线索过期天数", type: "number", group: "业务规则" },
  { key: "followup_reminder_hours", label: "跟进提醒提前小时", type: "number", group: "业务规则" },
  { key: "contract_prefix", label: "合同编号前缀", type: "text", group: "业务规则" },
  { key: "payment_prefix", label: "收款编号前缀", type: "text", group: "业务规则" },
  { key: "enable_dingtalk_notify", label: "启用钉钉通知", type: "boolean", group: "通知设置" },
  { key: "ai_gateway_base_url", label: "AI 接口地址", type: "text", group: "AI 智能配置", placeholder: "https://api.openai.com/v1" },
  { key: "ai_gateway_api_key", label: "AI 接口密钥 (API Key)", type: "password", group: "AI 智能配置", placeholder: "sk-..." },
  { key: "ai_gateway_model", label: "AI 模型名称", type: "text", group: "AI 智能配置", placeholder: "gpt-4o-mini" },
];

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [configMap, setConfigMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ConfigItem | null>(null);
  const [formData, setFormData] = useState({ configKey: "", configValue: "", description: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system-configs");
      if (!res.ok) throw new Error();
      const result = await res.json();
      setConfigs(result.list || []);
      setConfigMap(result.configMap || {});
      // 初始化编辑值
      const vals: Record<string, string> = {};
      COMMON_CONFIGS.forEach((c) => {
        vals[c.key] = result.configMap?.[c.key] !== undefined ? String(result.configMap[c.key]) : "";
      });
      setEditValues(vals);
    } catch {
      setFormError("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSaveCommon() {
    setSaving(true);
    try {
      // 批量保存
      await Promise.all(
        COMMON_CONFIGS.map((c) => {
          const val = editValues[c.key];
          if (val === undefined || val === "") return Promise.resolve();
          let configValue: any = val;
          if (c.type === "number") configValue = parseInt(val) || 0;
          if (c.type === "boolean") configValue = val === "true";
          return fetch("/api/system-configs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ configKey: c.key, configValue, description: c.label }),
          });
        })
      );
      alert("保存成功");
      fetchData();
    } catch {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("确定删除此配置？")) return;
    try {
      const res = await fetch(`/api/system-configs/${id}`, { method: "DELETE" });
      if (!res.ok) { alert("删除失败"); return; }
      fetchData();
    } catch { alert("网络错误"); }
  }

  function openNewForm() {
    setEditing(null);
    setFormData({ configKey: "", configValue: "", description: "" });
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(item: ConfigItem) {
    setEditing(item);
    setFormData({ configKey: item.configKey, configValue: typeof item.configValue === "object" ? JSON.stringify(item.configValue) : String(item.configValue), description: item.description || "" });
    setFormError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      let configValue: any = formData.configValue;
      // 尝试解析为 JSON
      try { configValue = JSON.parse(formData.configValue); } catch { /* 保持字符串 */ }
      const url = editing ? `/api/system-configs` : "/api/system-configs";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configKey: formData.configKey, configValue, description: formData.description }),
      });
      if (!res.ok) { const d = await res.json(); setFormError(d.error || "操作失败"); return; }
      setShowForm(false);
      fetchData();
    } catch { setFormError("网络错误"); } finally { setSubmitting(false); }
  }

  // 按分组展示
  const groups = COMMON_CONFIGS.reduce((acc, c) => {
    if (!acc[c.group]) acc[c.group] = [];
    acc[c.group].push(c);
    return acc;
  }, {} as Record<string, typeof COMMON_CONFIGS>);

  // 自定义配置（不在 COMMON_CONFIGS 中的）
  const customConfigs = configs.filter((c) => !COMMON_CONFIGS.find((cc) => cc.key === c.configKey));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系统配置</h1>
          <p className="text-sm text-gray-500 mt-1">管理系统的全局参数和运行配置</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />刷新
          </button>
          <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />新增配置
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-gray-400">加载中...</div>
      ) : (
        <>
          {/* 常用配置分组 */}
          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{groupName}</h2>
              <div className="space-y-4">
                {items.map((config) => (
                  <div key={config.key} className="flex items-center gap-4">
                    <label className="w-40 text-sm text-gray-600 flex-shrink-0">{config.label}</label>
                    {config.type === "boolean" ? (
                      <select value={editValues[config.key] || "false"} onChange={(e) => setEditValues({ ...editValues, [config.key]: e.target.value })} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="false">否</option>
                        <option value="true">是</option>
                      </select>
                    ) : (
                      <input
                        type={config.type === "password" ? "password" : config.type === "number" ? "number" : "text"}
                        value={editValues[config.key] || ""}
                        onChange={(e) => setEditValues({ ...editValues, [config.key]: e.target.value })}
                        placeholder={(config as any).placeholder || ""}
                        autoComplete="off"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    )}
                    <span className="text-xs text-gray-400 w-32 flex-shrink-0">{config.key}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button onClick={handleSaveCommon} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                  <Save className="w-4 h-4" />{saving ? "保存中..." : "保存配置"}
                </button>
              </div>
            </div>
          ))}

          {/* 自定义配置 */}
          {customConfigs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">自定义配置</h2>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">配置键</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">配置值</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">描述</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customConfigs.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{item.configKey}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{typeof item.configValue === "object" ? JSON.stringify(item.configValue) : String(item.configValue)}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{item.description || "-"}</td>
                      <td className="px-4 py-3 text-right">
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
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing ? "编辑配置" : "新增配置"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">配置键 *</label>
                <input type="text" value={formData.configKey} onChange={(e) => setFormData({ ...formData, configKey: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required disabled={!!editing} placeholder="如：custom_setting" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">配置值 *</label>
                <textarea value={formData.configValue} onChange={(e) => setFormData({ ...formData, configValue: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required placeholder="支持字符串、数字、JSON" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
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
