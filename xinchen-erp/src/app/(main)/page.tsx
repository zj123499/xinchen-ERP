"use client";

import { useState, useEffect } from "react";
import {
  Users, FileText, FileSignature, DollarSign, CircleDollarSign, Receipt,
  BadgeDollarSign, TrendingUp, PhoneCall, Clock,
  GraduationCap, Target, RefreshCw, Building2, Radio, Server,
  Briefcase, ClipboardCheck, ArrowUpRight, ArrowDownRight, Wallet,
} from "lucide-react";

interface DashboardData {
  todayNewLeads: number;
  pendingFollowLeads: number;
  monthContracts: number;
  monthPaymentAmount: number;
  todayVisits: number;
  yearCompletionRate: number;
  totalStudents: number;
  totalLeads: number;
  yearPaymentAmount: number;
  yearContractAmount: number;
  overview: Record<string, number>;
  finance: { monthPaymentAmount: number; monthCostAmount: number; yearPaymentAmount: number; yearCostAmount: number; yearContractAmount: number; monthProfit: number; yearProfit: number; completionRate: number; };
  leadsBySource: { label: string; value: number }[];
  leadsByStatus: { label: string; value: number }[];
  leadsByAssignee: { label: string; value: number }[];
  paymentsByType: { label: string; value: number; count: number }[];
  paymentsByMonth: { label: string; value: number; count: number }[];
  contractsByMonth: { month: string; count: number; amount: number }[];
  contractsByBusinessLine: { label: string; value: number; count: number }[];
  applicationsByStatus: { label: string; value: number }[];
  applicationsByInstitution: { label: string; value: number }[];
  studentsByCountry: { label: string; value: number }[];
  studentsByDegree: { label: string; value: number }[];
  commissionsByStatus: { label: string; value: number; count: number }[];
  visitRecordsByType: { label: string; value: number }[];
  recentLeads: { id: number; name: string; phone: string; status: string; assignee?: string; createdAt: string }[];
  recentPayments: { id: number; paymentNo: string; amount: number; studentName?: string; paidAt: string; paymentType: string }[];
  scope?: "all" | "self";
}

function formatCurrency(amount: number | undefined | null) {
  const v = Number(amount) || 0;
  return `\u00a5 ${v.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatCompact(amount: number | undefined | null) {
  const v = Number(amount) || 0;
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
  return v.toLocaleString("zh-CN");
}

// 简易柱状图组件
function BarChart({ data, color = "blue", height = 120 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500", green: "bg-green-500", purple: "bg-purple-500",
    orange: "bg-orange-500", cyan: "bg-cyan-500", indigo: "bg-indigo-500", rose: "bg-rose-500",
  };
  if (data.length === 0) return <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>暂无数据</div>;
  return (
    <div className="flex items-end justify-between gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end group relative" style={{ height: "100%" }}>
          <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
            {d.label}: {d.value}
          </div>
          <div
            className={`w-full rounded-t ${colorMap[color] || "bg-blue-500"} transition-all hover:opacity-80`}
            style={{ height: `${(d.value / maxVal) * 100}%`, minHeight: d.value > 0 ? "4px" : "0" }}
          />
          <span className="text-xs text-gray-400 mt-1 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// 简易进度条组件
function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500", green: "bg-green-500", purple: "bg-purple-500",
    orange: "bg-orange-500", cyan: "bg-cyan-500", rose: "bg-rose-500", indigo: "bg-indigo-500",
  };
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-20 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
        <div className={`h-full ${colorMap[color] || "bg-blue-500"} rounded-full transition-all`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs text-gray-700 font-medium">{value} ({pct}%)</span>
      </div>
    </div>
  );
}

// 数字卡片
function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: any; color: string; sub?: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600", orange: "bg-orange-50 text-orange-600",
    green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600",
    pink: "bg-pink-50 text-pink-600", indigo: "bg-indigo-50 text-indigo-600",
    cyan: "bg-cyan-50 text-cyan-600", amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600", emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error();
      const result = await res.json();
      setData(result);
    } catch {
      setError("数据加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">工作台</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-7 bg-gray-200 rounded w-16" />
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">工作台</h1>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">重试</button>
      </div>
    );
  }

  if (!data) return null;

  // 安全访问嵌套对象，防止 undefined 导致崩溃
  const ov = data.overview || {};
  const fin = data.finance || {};
  const commissionsByStatus = data.commissionsByStatus || [];
  const leadsBySource = data.leadsBySource || [];
  const leadsByStatus = data.leadsByStatus || [];
  const leadsByAssignee = data.leadsByAssignee || [];
  const paymentsByType = data.paymentsByType || [];
  const paymentsByMonth = data.paymentsByMonth || [];
  const contractsByMonth = data.contractsByMonth || [];
  const contractsByBusinessLine = data.contractsByBusinessLine || [];
  const applicationsByInstitution = data.applicationsByInstitution || [];
  const studentsByCountry = data.studentsByCountry || [];
  const studentsByDegree = data.studentsByDegree || [];
  const recentLeads = data.recentLeads || [];
  const recentPayments = data.recentPayments || [];

  const stats = [
    { label: "今日新增线索", value: String(data.todayNewLeads || 0), icon: Users, color: "blue", sub: `共${data.totalLeads || 0}条` },
    { label: "待跟进线索", value: String(data.pendingFollowLeads || 0), icon: Clock, color: "orange" },
    { label: "本月签约", value: String(data.monthContracts || 0), icon: FileText, color: "green", sub: `共${ov.totalContracts || 0}份` },
    { label: "本月收款", value: formatCurrency(fin.monthPaymentAmount), icon: DollarSign, color: "purple", sub: `利润${formatCurrency(fin.monthProfit)}` },
    { label: "今日待回访", value: String(data.todayVisits || 0), icon: PhoneCall, color: "pink" },
    { label: "本年业绩完成率", value: `${data.yearCompletionRate || 0}%`, icon: TrendingUp, color: "indigo", sub: `${formatCompact(fin.yearPaymentAmount)}/${formatCompact(fin.yearContractAmount)}` },
  ];

  const overviewStats = [
    { label: "学生总数", value: String(data.totalStudents || 0), icon: GraduationCap, color: "cyan" },
    { label: "线索总数", value: String(data.totalLeads || 0), icon: Target, color: "amber" },
    { label: "合同总数", value: String(ov.totalContracts || 0), icon: FileText, color: "emerald" },
    { label: "订单总数", value: String(ov.totalOrders || 0), icon: ClipboardCheck, color: "rose" },
    { label: "申请总数", value: String(ov.totalApplications || 0), icon: FileSignature, color: "blue" },
    { label: "收款笔数", value: String(ov.totalPayments || 0), icon: CircleDollarSign, color: "purple" },
    { label: "成本笔数", value: String(ov.totalCosts || 0), icon: Receipt, color: "orange" },
    { label: "员工总数", value: String(ov.employeesCount || 0), icon: Briefcase, color: "indigo" },
    { label: "合作方数", value: String(ov.partnersCount || 0), icon: Building2, color: "green" },
    { label: "站群数量", value: String(ov.sitesCount || 0), icon: Server, color: "cyan" },
    { label: "新媒体账号", value: String(ov.mediaAccountsCount || 0), icon: Radio, color: "pink" },
    { label: "佣金笔数", value: commissionsByStatus.reduce((s, c) => s + (c.count || 0), 0), icon: BadgeDollarSign, color: "amber" },
  ];

  const totalLeadsBySource = leadsBySource.reduce((s, d) => s + (d.value || 0), 0) || 1;
  const totalLeadsByStatus = leadsByStatus.reduce((s, d) => s + (d.value || 0), 0) || 1;
  const totalStudentsByCountry = studentsByCountry.reduce((s, d) => s + (d.value || 0), 0) || 1;
  const totalStudentsByDegree = studentsByDegree.reduce((s, d) => s + (d.value || 0), 0) || 1;

  const profitColor = (fin.monthProfit || 0) >= 0 ? "text-green-600" : "text-red-600";
  const yearProfitColor = (fin.yearProfit || 0) >= 0 ? "text-green-600" : "text-red-600";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">工作台</h1>
          {data.scope === "self" ? (
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200" title="仅显示你负责的数据">
              我的工作台（仅看我负责的数据）
            </span>
          ) : (
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-200" title="可查看全公司数据">
              全公司看板
            </span>
          )}
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" />刷新
        </button>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* 数据总览 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">数据总览</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {overviewStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{stat.label}</p>
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 财务概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">本月财务</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">本月收款</span>
              <span className="text-xl font-bold text-purple-600">{formatCurrency(fin.monthPaymentAmount)}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">本月成本</span>
              <span className="text-xl font-bold text-orange-600">{formatCurrency(fin.monthCostAmount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">本月利润</span>
              <span className={`text-xl font-bold ${profitColor}`}>
                <span className="inline-flex items-center">
                  {(fin.monthProfit || 0) >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  {formatCurrency(Math.abs(fin.monthProfit || 0))}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">本年财务</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">本年收款</span>
              <span className="text-xl font-bold text-purple-600">{formatCurrency(fin.yearPaymentAmount)}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">本年成本</span>
              <span className="text-xl font-bold text-orange-600">{formatCurrency(fin.yearCostAmount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">本年利润</span>
              <span className={`text-xl font-bold ${yearProfitColor}`}>
                <span className="inline-flex items-center">
                  {(fin.yearProfit || 0) >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  {formatCurrency(Math.abs(fin.yearProfit || 0))}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 线索分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">线索来源分布</h3>
          <div className="space-y-3">
            {leadsBySource.length === 0 ? <p className="text-sm text-gray-400">暂无数据</p> :
              leadsBySource.map((d, i) => (
                <ProgressBar key={i} label={d.label} value={d.value} total={totalLeadsBySource} color={["blue", "green", "purple", "orange", "cyan", "rose", "indigo"][i % 7]} />
              ))
            }
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">线索状态分布</h3>
          <div className="space-y-3">
            {leadsByStatus.length === 0 ? <p className="text-sm text-gray-400">暂无数据</p> :
              leadsByStatus.map((d, i) => (
                <ProgressBar key={i} label={d.label} value={d.value} total={totalLeadsByStatus} color={["blue", "green", "purple", "orange", "cyan", "rose", "indigo"][i % 7]} />
              ))
            }
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">{data.scope === "self" ? "我的线索状态分布" : "员工线索 TOP10"}</h3>
          <div className="space-y-3">
            {leadsByAssignee.length === 0 ? <p className="text-sm text-gray-400">暂无数据</p> :
              leadsByAssignee.map((d, i) => (
                <ProgressBar key={i} label={d.label} value={d.value} total={leadsByAssignee[0]?.value || 1} color="indigo" />
              ))
            }
          </div>
        </div>
      </div>

      {/* 收款 & 合同趋势 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">本年月度收款趋势</h3>
          <BarChart data={paymentsByMonth} color="purple" height={150} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">本年合同签约趋势</h3>
          <BarChart data={contractsByMonth.map((c) => ({ label: c.month, value: c.count }))} color="green" height={150} />
        </div>
      </div>

      {/* 收款类型 & 业务线 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">收款类型分布（本年）</h3>
          <div className="space-y-3">
            {paymentsByType.length === 0 ? <p className="text-sm text-gray-400">暂无数据</p> :
              paymentsByType.map((d, i) => {
                const total = paymentsByType.reduce((s, x) => s + (x.value || 0), 0) || 1;
                return <ProgressBar key={i} label={`${d.label} (${d.count}笔)`} value={d.value} total={total} color={["purple", "blue", "green", "orange"][i % 4]} />;
              })
            }
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">合同业务线分布（本年）</h3>
          <div className="space-y-3">
            {contractsByBusinessLine.length === 0 ? <p className="text-sm text-gray-400">暂无数据</p> :
              contractsByBusinessLine.map((d, i) => {
                const total = contractsByBusinessLine.reduce((s, x) => s + (x.value || 0), 0) || 1;
                return <ProgressBar key={i} label={`${d.label} (${d.count}份)`} value={d.value} total={total} color={["green", "blue", "indigo", "cyan"][i % 4]} />;
              })
            }
          </div>
        </div>
      </div>

      {/* 学生分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">学生目标国家分布</h3>
          <div className="space-y-3">
            {studentsByCountry.length === 0 ? <p className="text-sm text-gray-400">暂无数据</p> :
              studentsByCountry.map((d, i) => (
                <ProgressBar key={i} label={d.label} value={d.value} total={totalStudentsByCountry} color={["blue", "green", "purple", "orange", "cyan", "rose"][i % 6]} />
              ))
            }
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">学生目标学位分布</h3>
          <div className="space-y-3">
            {studentsByDegree.length === 0 ? <p className="text-sm text-gray-400">暂无数据</p> :
              studentsByDegree.map((d, i) => (
                <ProgressBar key={i} label={d.label} value={d.value} total={totalStudentsByDegree} color={["indigo", "purple", "blue", "green", "orange", "cyan"][i % 6]} />
              ))
            }
          </div>
        </div>
      </div>

      {/* 院校申请 & 佣金 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">申请院校 TOP10</h3>
          <div className="space-y-3">
            {applicationsByInstitution.length === 0 ? <p className="text-sm text-gray-400">暂无数据</p> :
              applicationsByInstitution.map((d, i) => (
                <ProgressBar key={i} label={d.label} value={d.value} total={applicationsByInstitution[0]?.value || 1} color="cyan" />
              ))
            }
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">佣金状态分布</h3>
          <div className="space-y-3">
            {commissionsByStatus.length === 0 ? <p className="text-sm text-gray-400">暂无数据</p> :
              commissionsByStatus.map((d, i) => {
                const total = commissionsByStatus.reduce((s, x) => s + (x.value || 0), 0) || 1;
                return <ProgressBar key={i} label={`${d.label} (${d.count}笔)`} value={d.value} total={total} color={["amber", "green", "orange"][i % 3]} />;
              })
            }
          </div>
        </div>
      </div>

      {/* 最近动态 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">最近线索</h3>
          {recentLeads.length === 0 ? <p className="text-sm text-gray-400">暂无数据</p> :
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="font-medium text-gray-900 text-sm">{lead.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{lead.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{lead.assignee}</span>
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{lead.status}</span>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">最近收款</h3>
          {recentPayments.length === 0 ? <p className="text-sm text-gray-400">暂无数据</p> :
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="font-medium text-gray-900 text-sm">{payment.studentName || "未知"}</span>
                    <span className="text-xs text-gray-400 ml-2">{payment.paymentType}</span>
                  </div>
                  <span className="font-bold text-purple-600 text-sm">{formatCurrency(payment.amount)}</span>
                </div>
              ))}
            </div>
          }
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "新建线索", href: "/leads", color: "bg-blue-600" },
            { label: "新建合同", href: "/contracts", color: "bg-green-600" },
            { label: "录入回访", href: "/visit-records", color: "bg-purple-600" },
            { label: "收款登记", href: "/payments", color: "bg-orange-600" },
          ].map((action) => (
            <a key={action.label} href={action.href} className={`${action.color} text-white text-center py-3 rounded-lg font-medium hover:opacity-90 transition`}>
              {action.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
