"use client";

import { useState, useEffect } from "react";
import { RefreshCw, AlertTriangle, ShieldAlert, ShieldCheck, Bell, ScanSearch } from "lucide-react";

interface RiskRecordItem { id: number; riskLevel: string; status: string; detail: string | null; detectedAt: string; rule: { name: string }; student: { name: string } | null; }
interface NotificationItem { id: number; content: string; channel: string; read: boolean; sentAt: string; }

const LEVEL_META: Record<string, { label: string; color: string; ring: string }> = {
  HIGH: { label: "高", color: "bg-red-100 text-red-700", ring: "border-red-300" },
  MEDIUM: { label: "中", color: "bg-orange-100 text-orange-700", ring: "border-orange-300" },
  LOW: { label: "低", color: "bg-yellow-100 text-yellow-700", ring: "border-yellow-300" },
};
const STATUS_META: Record<string, string> = { OPEN: "待处置", RESOLVED: "已解决", IGNORED: "已忽略" };

export default function RiskDashboardPage() {
  const [records, setRecords] = useState<RiskRecordItem[]>([]);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  function fetchAll() {
    setLoading(true);
    Promise.all([
      fetch("/api/risk-records?pageSize=50").then((r) => r.json()),
      fetch("/api/risk-notifications").then((r) => r.json()),
    ]).then(([r, n]) => {
      setRecords(r.list || []);
      setNotifs(n.list || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { fetchAll(); }, []);

  async function runScan() {
    setScanning(true); setScanMsg("");
    try {
      const res = await fetch("/api/risk-scan", { method: "POST" });
      const d = await res.json();
      setScanMsg(d.message || "扫描完成");
      fetchAll();
    } catch { setScanMsg("扫描失败"); } finally { setScanning(false); }
  }

  async function resolve(id: number) {
    await fetch(`/api/risk-records/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "RESOLVED" }) });
    fetchAll();
  }
  async function ignore(id: number) {
    await fetch(`/api/risk-records/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "IGNORED" }) });
    fetchAll();
  }
  async function markRead(id: number) {
    await fetch(`/api/risk-notifications/${id}/read`, { method: "POST" });
    fetchAll();
  }

  const stats = [
    { label: "高风险", value: records.filter((r) => r.riskLevel === "HIGH" && r.status === "OPEN").length, icon: ShieldAlert, color: "text-red-600 bg-red-50" },
    { label: "中风险", value: records.filter((r) => r.riskLevel === "MEDIUM" && r.status === "OPEN").length, icon: AlertTriangle, color: "text-orange-600 bg-orange-50" },
    { label: "待处置总数", value: records.filter((r) => r.status === "OPEN").length, icon: ShieldCheck, color: "text-blue-600 bg-blue-50" },
    { label: "未读通知", value: notifs.filter((n) => !n.read).length, icon: Bell, color: "text-purple-600 bg-purple-50" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">风险看板</h1><p className="text-sm text-gray-500 mt-1">主动预警学生交付风险，降低流失与投诉</p></div>
        <button onClick={runScan} disabled={scanning} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60">
          <ScanSearch className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} /> {scanning ? "扫描中..." : "运行风险扫描"}
        </button>
      </div>

      {scanMsg && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">{scanMsg}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-3">
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="w-5 h-5" /></div>
          <div><div className="text-2xl font-bold text-gray-900">{s.value}</div><div className="text-xs text-gray-500">{s.label}</div></div>
        </div>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">风险记录</h2>
            <button onClick={fetchAll} className="p-1.5 text-gray-400 hover:text-gray-600 rounded"><RefreshCw className="w-4 h-4" /></button>
          </div>
          {loading ? <div className="flex items-center justify-center py-16 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>
            : records.length === 0 ? <div className="py-16 text-center text-gray-400 text-sm">暂无风险记录，点击右上角运行扫描</div>
              : <table className="w-full"><thead><tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">等级</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">规则 / 详情</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学生</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">检测时间</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr></thead><tbody className="divide-y divide-gray-100">
                {records.map((r) => <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${LEVEL_META[r.riskLevel]?.color}`}>{LEVEL_META[r.riskLevel]?.label}</span></td>
                  <td className="px-4 py-3"><div className="font-medium text-gray-900 text-sm">{r.rule.name}</div><div className="text-xs text-gray-500 max-w-[220px] truncate">{r.detail || "-"}</div></td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{r.student?.name || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{STATUS_META[r.status]}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{new Date(r.detectedAt).toLocaleDateString("zh-CN")}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1">
                    {r.status === "OPEN" && <><button onClick={() => resolve(r.id)} className="px-2 py-1 text-xs text-green-700 bg-green-50 rounded hover:bg-green-100">解决</button>
                    <button onClick={() => ignore(r.id)} className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200">忽略</button></>}
                  </div></td>
                </tr>)}
              </tbody></table>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200"><h2 className="font-semibold text-gray-900">风险通知</h2></div>
          <div className="max-h-[520px] overflow-y-auto">
            {notifs.length === 0 ? <div className="py-12 text-center text-gray-400 text-sm">暂无通知</div>
              : notifs.map((n) => <div key={n.id} className={`px-4 py-3 border-b border-gray-100 flex items-start gap-2 ${n.read ? "" : "bg-blue-50/40"}`}>
                <Bell className={`w-4 h-4 mt-0.5 ${n.read ? "text-gray-300" : "text-blue-500"}`} />
                <div className="flex-1"><p className="text-sm text-gray-700">{n.content}</p><p className="text-xs text-gray-400 mt-1">{new Date(n.sentAt).toLocaleString("zh-CN")}</p></div>
                {!n.read && <button onClick={() => markRead(n.id)} className="text-xs text-blue-600 hover:underline">已读</button>}
              </div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
