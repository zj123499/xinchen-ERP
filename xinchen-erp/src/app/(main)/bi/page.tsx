"use client";

import { useState, useEffect } from "react";
import { RefreshCw, TrendingUp, Wallet, Users, FileSignature, AlertTriangle } from "lucide-react";

interface Dash {
  todayNewLeads: number; pendingFollowLeads: number; monthContracts: number; monthPaymentAmount: number;
  todayVisits: number; yearCompletionRate: number; totalStudents: number; totalLeads: number;
  yearPaymentAmount: number; yearContractAmount: number;
  finance: { monthProfit: number; yearProfit: number; monthCostAmount: number; yearCostAmount: number; completionRate: number };
  overview: { totalContracts: number; totalOrders: number; totalApplications: number; totalPayments: number; totalCosts: number; mediaAccountsCount: number; sitesCount: number; partnersCount: number; employeesCount: number };
  leadsBySource: { label: string; value: number }[];
  leadsByStatus: { label: string; value: number }[];
  paymentsByType: { label: string; value: number; count: number }[];
  paymentsByMonth: { label: string; value: number; count: number }[];
  contractsByBusinessLine: { label: string; value: number; count: number }[];
  studentsByCountry: { label: string; value: number }[];
  applicationsByStatus: { label: string; value: number }[];
  visitRecordsByType: { label: string; value: number }[];
  recentLeads: any[]; recentPayments: any[];
}

function Bar({ items, value, color = "bg-blue-500" }: { items: { label: string; value: number }[]; value?: (i: any) => number; color?: string }) {
  const max = Math.max(...items.map(value || ((i) => i.value)), 1);
  return (
    <div className="space-y-2">
      {items.map((it, idx) => { const v = value ? value(it) : it.value; return (
        <div key={idx} className="flex items-center gap-2 text-xs">
          <span className="w-20 truncate text-gray-600 text-right">{it.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
            <div className={`${color} h-4 rounded-full`} style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <span className="w-12 text-right text-gray-500">{v.toLocaleString()}</span>
        </div>); })}
    </div>
  );
}

function Donut({ items, color = "bg-blue-500" }: { items: { label: string; value: number }[]; color?: string }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const palette = ["bg-blue-500", "bg-green-500", "bg-orange-500", "bg-purple-500", "bg-pink-500", "bg-teal-500", "bg-red-400"];
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
          {(() => { let acc = 0; return items.map((it, idx) => { const pct = (it.value / total) * 100; const seg = <circle key={idx} cx="18" cy="18" r="15.915" fill="none" strokeWidth="4" stroke={["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ec4899", "#14b8a6", "#f87171"][idx % 7]} strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={100 - acc} />; acc += pct; return seg; }); })()}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">占比</div>
      </div>
      <div className="space-y-1 text-xs">
        {items.map((it, idx) => <div key={idx} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded-sm ${palette[idx % palette.length]}`} />{it.label}<span className="text-gray-400">({((it.value / total) * 100).toFixed(0)}%)</span></div>)}
      </div>
    </div>
  );
}

function Card({ children, title, icon: Icon }: { children: React.ReactNode; title: string; icon?: any }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4"><Icon className="w-4 h-4 text-gray-400" /><h3 className="text-sm font-semibold text-gray-700">{title}</h3></div>
      {children}
    </div>
  );
}

export default function BIPage() {
  const [d, setD] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);

  function fetchData() {
    setLoading(true);
    fetch("/api/dashboard").then((r) => r.json()).then((data) => setD(data)).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { fetchData(); }, []);

  if (loading || !d) {
    return <div className="p-6 flex items-center justify-center text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...</div>;
  }

  const kpis = [
    { label: "今日新线索", value: d.todayNewLeads, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "本月签约", value: d.monthContracts, icon: FileSignature, color: "text-green-600 bg-green-50" },
    { label: "本月收款", value: `¥${(d.monthPaymentAmount / 10000).toFixed(1)}万`, icon: Wallet, color: "text-purple-600 bg-purple-50" },
    { label: "年度回款率", value: `${d.yearCompletionRate}%`, icon: TrendingUp, color: "text-orange-600 bg-orange-50" },
    { label: "待跟进线索", value: d.pendingFollowLeads, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
    { label: "在册学生", value: d.totalStudents, icon: Users, color: "text-teal-600 bg-teal-50" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">经营驾驶舱</h1><p className="text-sm text-gray-500 mt-1">全维度经营数据实时概览</p></div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"><RefreshCw className="w-4 h-4" /> 刷新</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {kpis.map((k) => <div key={k.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${k.color}`}><k.icon className="w-4 h-4" /></div>
          <div className="text-xl font-bold text-gray-900">{k.value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
        </div>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card title="收款类型分布" icon={Wallet}><Donut items={(d.paymentsByType || []).map((p) => ({ label: p.label, value: Math.round(p.value) }))} /></Card>
        <Card title="线索来源" icon={Users}><Bar items={d.leadsBySource || []} color="bg-blue-500" /></Card>
        <Card title="学生目标国家" icon={Users}><Bar items={(d.studentsByCountry || []).slice(0, 6)} color="bg-teal-500" /></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card title="月度收款趋势 (本年)" icon={TrendingUp}><Bar items={d.paymentsByMonth || []} color="bg-purple-500" /></Card>
        <Card title="业务线合同金额 (本年)" icon={FileSignature}><Bar items={(d.contractsByBusinessLine || []).map((c) => ({ label: c.label, value: Math.round(c.value) }))} color="bg-orange-500" /></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="线索状态" icon={Users}><Donut items={d.leadsByStatus || []} /></Card>
        <Card title="申请状态" icon={FileSignature}><Donut items={d.applicationsByStatus || []} /></Card>
        <Card title="回访类型" icon={TrendingUp}><Donut items={d.visitRecordsByType || []} /></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">最新线索</h3>
          <div className="space-y-2">
            {(d.recentLeads || []).map((l) => <div key={l.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2">
              <div><span className="font-medium text-gray-800">{l.name}</span><span className="text-gray-400 text-xs ml-2">{l.phone}</span></div>
              <div className="text-xs text-gray-500">{l.assignee || "-"} · {new Date(l.createdAt).toLocaleDateString("zh-CN")}</div>
            </div>)}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">近期收款</h3>
          <div className="space-y-2">
            {(d.recentPayments || []).map((p) => <div key={p.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2">
              <div><span className="font-medium text-gray-800">{p.studentName || "-"}</span><span className="text-gray-400 text-xs ml-2">{p.paymentNo}</span></div>
              <div className="text-xs text-green-600 font-medium">¥{Number(p.amount).toLocaleString()} · {new Date(p.paidAt).toLocaleDateString("zh-CN")}</div>
            </div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
