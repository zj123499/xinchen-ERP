"use client";

import { useState, useEffect } from "react";
import { RefreshCw, BarChart3, TrendingUp, Users, FileSignature, DollarSign } from "lucide-react";

interface RoiRow {
  channel: string;
  channelLabel: string;
  touchCount: number;
  reachStudents: number;
  signStudents: number;
  signAmount: number;
  marketingCost: number;
  roi: number | null;
}

interface RoiResponse {
  model: string;
  summary: {
    totalTouch: number;
    totalReach: number;
    totalSign: number;
    totalSignAmount: number;
    totalCost: number;
  };
  rows: RoiRow[];
}

const MODEL_MAP: Record<string, string> = {
  FIRST_TOUCH: "首次触达", LAST_TOUCH: "末次触达",
  LINEAR: "线性归因", TIME_DECAY: "时间衰减",
};

const CHANNEL_COLORS: Record<string, string> = {
  SEARCH: "bg-blue-500", SOCIAL: "bg-pink-500", REFERRAL: "bg-green-500",
  PARTNER: "bg-purple-500", SITE: "bg-cyan-500", OFFLINE: "bg-orange-500", OTHER: "bg-gray-500",
};

export default function ChannelRoiPage() {
  const [data, setData] = useState<RoiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState("LAST_TOUCH");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/channels/roi?model=${model}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setError("加载失败"))
      .finally(() => setLoading(false));
  }, [model]);

  const summary = data?.summary;
  const maxAmount = Math.max(1, ...(data?.rows.map((r) => r.signAmount) || [0]));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">渠道 ROI 看板</h1>
          <p className="text-sm text-gray-500 mt-1">各渠道：花费 → 触达 → 签约 → 签约额 → ROI</p>
        </div>
        <select value={model}
          onChange={(e) => setModel(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          {Object.entries(MODEL_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2"><Users className="w-4 h-4" /> 总触达学生</div>
          <div className="text-2xl font-bold text-gray-900">{summary?.totalReach ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2"><FileSignature className="w-4 h-4" /> 签约学生</div>
          <div className="text-2xl font-bold text-gray-900">{summary?.totalSign ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2"><DollarSign className="w-4 h-4" /> 归因签约额</div>
          <div className="text-2xl font-bold text-gray-900">¥{((summary?.totalSignAmount) || 0).toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2"><BarChart3 className="w-4 h-4" /> 营销总花费</div>
          <div className="text-2xl font-bold text-gray-900">¥{((summary?.totalCost) || 0).toLocaleString()}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> 加载中...
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">渠道</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">触点</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">触达学生</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">签约学生</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">签约额（归因）</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">占比</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data?.rows || []).map((r) => (
                <tr key={r.channel} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <span className={`w-2.5 h-2.5 rounded-full ${CHANNEL_COLORS[r.channel] || "bg-gray-500"}`} />
                      {r.channelLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.touchCount}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.reachStudents}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.signStudents}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">¥{r.signAmount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${CHANNEL_COLORS[r.channel] || "bg-gray-500"}`}
                          style={{ width: `${Math.round((r.signAmount / maxAmount) * 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{Math.round((r.signAmount / maxAmount) * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.roi === null ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${r.roi >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        <TrendingUp className="w-3 h-3" /> {r.roi >= 0 ? "+" : ""}{(r.roi * 100).toFixed(0)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data?.rows || []).length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              暂无数据，请先在「触点管理」录入触点并执行「重跑归因」
            </div>
          )}
        </div>
      )}
    </div>
  );
}
