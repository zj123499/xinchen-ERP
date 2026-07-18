"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, ChevronLeft, ChevronRight, TrendingUp, PlayCircle, Filter,
} from "lucide-react";

interface AttributionItem {
  id: number;
  studentId: number;
  touchpointId: number;
  model: string;
  weight: number;
  attributedAmount: number;
  student?: { id: number; name: string };
  touchpoint?: { id: number; channel: string; source: string };
  contract?: { id: number; contractNo: string; totalAmount: number };
}

interface PaginatedResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: AttributionItem[];
}

const MODEL_MAP: Record<string, { label: string; desc: string }> = {
  FIRST_TOUCH: { label: "首次触达", desc: "归因给第一个触点" },
  LAST_TOUCH: { label: "末次触达", desc: "归因给签约前最后触点" },
  LINEAR: { label: "线性归因", desc: "所有触点均分" },
  TIME_DECAY: { label: "时间衰减", desc: "越近触点权重越高" },
};

const CHANNEL_LABELS: Record<string, string> = {
  SEARCH: "搜索引擎", SOCIAL: "新媒体", REFERRAL: "转介绍",
  PARTNER: "合作方", SITE: "站群", OFFLINE: "线下/展会", OTHER: "其他",
};

export default function AttributionsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState("LAST_TOUCH");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("model", model);
      const res = await fetch(`/api/attributions?${params.toString()}`);
      const result = await res.json();
      setData(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, model]);

  useEffect(() => { fetchList(); }, [fetchList]);

  async function runAttribution() {
    setRunning(true);
    setRunMsg("");
    try {
      const res = await fetch("/api/attribution/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      const result = await res.json();
      if (!res.ok) {
        setRunMsg(result.error || "重跑失败");
        return;
      }
      setRunMsg(result.message || "归因重跑完成");
      fetchList();
    } catch {
      setRunMsg("网络错误");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">归因结果</h1>
          <p className="text-sm text-gray-500 mt-1">基于多触点归因模型，量化各渠道对签约的贡献</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={model}
            onChange={(e) => { setModel(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            {Object.entries(MODEL_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button onClick={runAttribution} disabled={running}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition shadow-sm">
            <PlayCircle className="w-4 h-4" /> {running ? "计算中..." : "重跑归因"}
          </button>
        </div>
      </div>

      {runMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> {runMsg}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> 加载中...
          </div>
        ) : !data || data.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Filter className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-sm">暂无归因数据，请先录入触点并点击「重跑归因」</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">学生</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">归因渠道</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">权重</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">归因金额</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">关联合同</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.list.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm text-gray-700">{a.student?.name || "未知"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {CHANNEL_LABELS[a.touchpoint?.channel || "OTHER"] || "其他"}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">{a.touchpoint?.source}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{(a.weight * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        ¥{(Number(a.attributedAmount) || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {a.contract ? `${a.contract.contractNo}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-sm text-gray-500">共 {data.total} 条，第 {data.page}/{data.totalPages} 页</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                  className="p-1.5 rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 transition">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
