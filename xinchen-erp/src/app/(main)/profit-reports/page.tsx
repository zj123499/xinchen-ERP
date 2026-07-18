"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, RefreshCw, ChevronLeft, ChevronRight,
  CircleDollarSign, Receipt, BadgeDollarSign, PiggyBank, Loader2,
} from "lucide-react";

interface ProfitReport {
  id: number;
  fiscalYear: number;
  fiscalMonth: number;
  totalIncome: number;
  totalCost: number;
  totalCommission: number;
  netProfit: number;
  createdAt: string;
}

interface PaginatedResponse {
  total: number; page: number; pageSize: number; totalPages: number; list: ProfitReport[];
}

function fmt(n: number | string | null | undefined): string {
  const v = Number(n) || 0;
  return `¥ ${v.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function monthLabel(y: number, m: number): string {
  return `${y}年${String(m).padStart(2, "0")}月`;
}

export default function ProfitReportsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ income: 0, cost: 0, commission: 0, profit: 0 });
  const [page, setPage] = useState(1);
  const [summarizing, setSummarizing] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/profit-reports?page=${page}&pageSize=12`);
      if (!res.ok) throw new Error();
      const json: PaginatedResponse = await res.json();
      setData(json);

      // 累计口径（遍历所有月份求和）
      const sum = { income: 0, cost: 0, commission: 0, profit: 0 };
      json.list.forEach((r) => {
        sum.income += Number(r.totalIncome) || 0;
        sum.cost += Number(r.totalCost) || 0;
        sum.commission += Number(r.totalCommission) || 0;
        sum.profit += Number(r.netProfit) || 0;
      });
      setSummary(sum);
    } catch {
      setMsg("数据加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  // 汇总上月经营数据
  const summarize = async () => {
    setSummarizing(true);
    setMsg("");
    try {
      const res = await fetch("/api/profit-reports", { method: "POST" });
      if (!res.ok) throw new Error();
      const r = await res.json();
      setMsg(`已${r.message || "汇总"}：${monthLabel(r.fiscalYear, r.fiscalMonth)} 净利 ${fmt(r.netProfit)}`);
      setPage(1);
      load();
    } catch {
      setMsg("汇总失败，请稍后重试");
    } finally {
      setSummarizing(false);
    }
  };

  const cards = [
    { label: "累计收入", value: summary.income, icon: CircleDollarSign, color: "blue", sub: "收款合计" },
    { label: "累计成本", value: summary.cost, icon: Receipt, color: "orange", sub: "支出合计" },
    { label: "累计佣金", value: summary.commission, icon: BadgeDollarSign, color: "purple", sub: "提成支出" },
    { label: "累计净利", value: summary.profit, icon: PiggyBank, color: summary.profit >= 0 ? "green" : "red", sub: "收入-成本-佣金" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" /> 利润报表 BI 驾驶舱
          </h1>
          <p className="text-sm text-gray-500 mt-1">按月自动汇总经营数据，收入 − 成本 − 佣金 = 净利</p>
        </div>
        <button
          onClick={summarize}
          disabled={summarizing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
        >
          {summarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          汇总上月数据
        </button>
      </div>

      {msg && <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 text-sm">{msg}</div>}

      {/* 汇总卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => {
          const Icon = c.icon;
          const colorMap: Record<string, string> = {
            blue: "bg-blue-500", orange: "bg-orange-500", purple: "bg-purple-500",
            green: "bg-green-500", red: "bg-red-500",
          };
          return (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{c.label}</span>
                <div className={`w-10 h-10 rounded-lg ${colorMap[c.color]} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-gray-900">{fmt(c.value)}</div>
              <div className="text-xs text-gray-400 mt-1">{c.sub}</div>
            </div>
          );
        })}
      </div>

      {/* 月度报表表格 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">月度经营报表</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <span>{data ? `${page} / ${data.totalPages}` : "-"}</span>
            <button disabled={!data || page >= data.totalPages} onClick={() => setPage((p) => p + 1)}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">加载中…</div>
        ) : !data || data.list.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            暂无报表，点击右上角「汇总上月数据」生成首份月度经营报表
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left font-medium">会计期间</th>
                <th className="px-5 py-3 text-right font-medium">收入</th>
                <th className="px-5 py-3 text-right font-medium">成本</th>
                <th className="px-5 py-3 text-right font-medium">佣金</th>
                <th className="px-5 py-3 text-right font-medium">净利</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.list.map((r) => {
                const profit = Number(r.netProfit) || 0;
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{monthLabel(r.fiscalYear, r.fiscalMonth)}</td>
                    <td className="px-5 py-3 text-right text-green-600">{fmt(r.totalIncome)}</td>
                    <td className="px-5 py-3 text-right text-orange-600">{fmt(r.totalCost)}</td>
                    <td className="px-5 py-3 text-right text-purple-600">{fmt(r.totalCommission)}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {fmt(r.netProfit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
