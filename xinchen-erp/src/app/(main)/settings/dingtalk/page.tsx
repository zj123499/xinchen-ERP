"use client";

import { useState, useEffect } from "react";
import { Save, Key, Eye, EyeOff, RefreshCw, CheckCircle, AlertCircle, Smartphone, QrCode } from "lucide-react";

interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  stats?: {
    departments: { created: number; updated: number };
    employees: { created: number; updated: number };
    users: { created: number; updated: number };
  };
}

export default function DingtalkSettingsPage() {
  const [appKey, setAppKey] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [appKeyConfigured, setAppKeyConfigured] = useState(false);
  const [appSecretConfigured, setAppSecretConfigured] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const res = await fetch("/api/dingtalk/sync");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const dt = data.dingtalk || {};
      setAppKey("");
      setAppSecret("");
      setAppKeyConfigured(!!dt.appKeyConfigured);
      setAppSecretConfigured(!!dt.appSecretConfigured);
      setConfigured(!!dt.configured);
    } catch {
      setSaveMsg({ type: "error", text: "获取配置失败" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const body: Record<string, string> = {};
      if (appKey) body.appKey = appKey;
      if (appSecret) body.appSecret = appSecret;

      const res = await fetch("/api/dingtalk/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMsg({ type: "error", text: data.error || "保存失败" });
        return;
      }
      setSaveMsg({ type: "success", text: "配置保存成功" });
      setAppKey("");
      setAppSecret("");
      fetchConfig();
    } catch {
      setSaveMsg({ type: "error", text: "网络错误" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setSyncError("");
    try {
      const res = await fetch("/api/dingtalk/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncError(data.error || "同步失败");
        return;
      }
      setSyncResult(data);
    } catch {
      setSyncError("同步请求失败");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">钉钉集成配置</h1>

      {/* 应用凭证配置 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">应用凭证</h2>
          {configured ? (
            <span className="ml-auto flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" />已配置
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" />未配置
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500 mb-4">
          在钉钉开放平台创建应用后获取 AppKey 和 AppSecret，配置后即可使用钉钉免登和组织架构同步功能。
        </p>

        {loading ? (
          <div className="py-8 text-center text-gray-400 text-sm">加载中...</div>
        ) : (
          <div className="space-y-4">
            {/* AppKey */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                AppKey
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={appKey}
                  onChange={(e) => setAppKey(e.target.value)}
                  placeholder={appKeyConfigured ? "已配置（输入新值可修改）" : "请输入钉钉应用 AppKey"}
                  className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* AppSecret */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                AppSecret
              </label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder={appSecretConfigured ? "已配置（输入新值可修改）" : "请输入钉钉应用 AppSecret"}
                  className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {saveMsg && (
              <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                saveMsg.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}>
                {saveMsg.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {saveMsg.text}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || (!appKey && !appSecret)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "保存中..." : "保存配置"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 组织架构同步 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">组织架构同步</h2>
        <p className="text-sm text-gray-500 mb-4">
          将钉钉组织架构（部门、员工）同步到本地系统。同步后，钉钉用户可直接免登访问系统。
        </p>
        <button
          onClick={handleSync}
          disabled={syncing || !configured}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
        >
          {syncing ? "同步中..." : "立即同步"}
        </button>
        {!configured && (
          <p className="mt-2 text-xs text-orange-600">请先保存 AppKey 和 AppSecret 后再同步</p>
        )}

        {syncError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-700">{syncError}</div>
          </div>
        )}

        {syncResult && (
          <div className={`mt-4 p-4 rounded-lg ${syncResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <div className={`text-sm font-medium ${syncResult.success ? "text-green-800" : "text-red-800"}`}>
              {syncResult.message || syncResult.error}
            </div>
            {syncResult.stats && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {syncResult.stats.departments.created + syncResult.stats.departments.updated}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">部门</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {syncResult.stats.employees.created + syncResult.stats.employees.updated}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">员工</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {syncResult.stats.users.created + syncResult.stats.users.updated}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">用户</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 免登说明 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">钉钉免登</h2>
        </div>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">方式一：钉钉客户端内打开（自动免登）</p>
              <p className="text-gray-500 mt-1">在钉钉工作台或钉钉聊天中点击系统链接，自动获取免登码完成登录，无需输入账号密码。</p>
              <p className="text-gray-400 mt-1 text-xs">需在钉钉开放平台配置应用首页地址为：http://111.229.72.128:3000/login</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <QrCode className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">方式二：账号密码登录</p>
              <p className="text-gray-500 mt-1">在浏览器中直接访问系统地址，使用同步过来的钉钉用户名（钉钉 userid）和初始密码登录。</p>
              <p className="text-gray-400 mt-1 text-xs">初始密码格式：dingtalk_用户userid，建议登录后修改密码。</p>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-xs text-orange-700">
            <strong>注意：</strong>免登功能需要在钉钉开放平台的应用配置中，将服务器出口 IP 添加到"IP白名单"中（当前服务器 IP: 111.229.72.128）。
          </p>
        </div>
      </div>

      {/* 事件订阅 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">事件订阅</h2>
        <p className="text-sm text-gray-500 mb-4">Stream 模式自动订阅以下事件：</p>
        <div className="space-y-2">
          {[
            { event: "user_add_org", desc: "用户入职时自动创建系统账号" },
            { event: "user_leave_org", desc: "用户离职时自动停用账号" },
            { event: "user_modify_org", desc: "用户信息变更时自动同步" },
            { event: "org_dept_create", desc: "部门创建时自动同步" },
            { event: "org_dept_modify", desc: "部门修改时自动同步" },
            { event: "org_dept_remove", desc: "部门删除时自动同步" },
          ].map((item) => (
            <div key={item.event} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <code className="text-xs bg-gray-200 px-2 py-0.5 rounded font-mono text-gray-700">{item.event}</code>
              <span className="text-sm text-gray-500">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 启动方式 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Stream 启动</h2>
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm">
          npm run dingtalk:stream
        </div>
        <p className="text-xs text-gray-400 mt-3">
          在服务器上独立运行此命令，启动 Stream 长连接接收钉钉事件。
        </p>
      </div>
    </div>
  );
}
