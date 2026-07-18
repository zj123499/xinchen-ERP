"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as echarts from "echarts";

// ============================================================
// P9 动态数据大屏（深度动态版）
// - 顶部 5 节点申请进度漏斗（流动）
// - 学生申请进度滚动墙（无缝循环，当前节点脉冲）
// - ECharts 动态图表 + 数字滚动 + 自动刷新 + 实时时钟
// 复用 /api/dashboard + 新增 /api/bi/applications-progress
// ============================================================

interface DashboardData {
  todayNewLeads: number;
  pendingFollowLeads: number;
  monthContracts: number;
  monthPaymentAmount: number;
  todayVisits: number;
  yearCompletionRate: number;
  totalStudents: number;
  totalLeads: number;
  finance: {
    monthPaymentAmount: number; monthCostAmount: number;
    yearPaymentAmount: number; yearCostAmount: number;
    yearContractAmount: number; monthProfit: number; yearProfit: number;
    completionRate: number;
  };
  overview: Record<string, number>;
  leadsBySource: { label: string; value: number }[];
  leadsByStatus: { label: string; value: number }[];
  paymentsByMonth: { label: string; value: number; count: number }[];
  contractsByMonth: { month: string; count: number; amount: number }[];
  contractsByBusinessLine: { label: string; value: number; count: number }[];
}

interface AppItem {
  id: number;
  studentName: string;
  country: string;
  institution: string;
  major: string;
  degree: string;
  status: string;
  orderStatus: string;
  currentStep: number;
  isClosed: boolean;
  updatedAt: string;
}
interface ProgressData {
  nodes: string[];
  total: number;
  nodeCounts: number[];
  closedCount: number;
  items: AppItem[];
}

const C = {
  cyan: "#22d3ee", blue: "#3b82f6", purple: "#a855f7", green: "#34d399",
  orange: "#fbbf24", pink: "#f472b6", red: "#f87171",
};
const PALETTE = [C.cyan, C.blue, C.purple, C.green, C.orange, C.pink, C.red];
const fmtMoney = (n: number) => (n / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 1 }) + " 万";

// ---------- 数字滚动 ----------
function AnimatedNumber({ value, decimals = 0, duration = 1200 }: { value: number; decimals?: number; duration?: number; }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const from = fromRef.current, to = value || 0, start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);
  return <span>{display.toLocaleString("zh-CN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
}

// ---------- ECharts 容器 ----------
function EChart({ option, height = 280 }: { option: echarts.EChartsOption; height?: number; }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    chartRef.current = echarts.init(ref.current);
    const onResize = () => chartRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); chartRef.current?.dispose(); };
  }, []);
  useEffect(() => { chartRef.current?.setOption(option, true); }, [option]);
  return <div ref={ref} style={{ width: "100%", height }} />;
}

// ---------- 学生申请进度滚动墙 ----------
function ProgressWall({ data }: { data: ProgressData }) {
  // 双份复制实现无缝循环
  const loop = useMemo(() => (data.items.length > 4 ? [...data.items, ...data.items] : data.items), [data.items]);
  const dur = Math.max(20, data.items.length * 4);
  return (
    <div className="pw">
      <div className="pw-track" style={{ animationDuration: `${dur}s` }}>
        {loop.map((it, i) => (
          <div className="pw-card" key={`${it.id}-${i}`}>
            <div className="pw-head">
              <span className="pw-name">{it.studentName}</span>
              <span className="pw-tag">{it.country}</span>
              {it.isClosed && <span className="pw-done">已结案</span>}
            </div>
            <div className="pw-school">{it.institution} · {it.major}</div>
            <div className="pw-steps">
              {data.nodes.map((n, idx) => {
                const state = idx < it.currentStep ? "done" : idx === it.currentStep ? (it.isClosed ? "done" : "current") : "todo";
                return (
                  <div className={`pw-step ${state}`} key={idx}>
                    <span className="pw-dot" />
                    <span className="pw-label">{n}</span>
                    {idx < data.nodes.length - 1 && <span className="pw-line" />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .pw { height: 100%; overflow: hidden; position: relative; }
        .pw::before, .pw::after {
          content: ""; position: absolute; left: 0; right: 0; height: 40px; z-index: 2; pointer-events: none;
        }
        .pw::before { top: 0; background: linear-gradient(180deg, #0a1426 0%, transparent 100%); }
        .pw::after { bottom: 0; background: linear-gradient(0deg, #0a1426 0%, transparent 100%); }
        .pw-track { display: flex; flex-direction: column; gap: 10px; animation: pwscroll linear infinite; }
        @keyframes pwscroll { from { transform: translateY(0); } to { transform: translateY(-50%); } }
        .pw-card {
          background: linear-gradient(135deg, rgba(20,33,56,.9), rgba(12,20,38,.7));
          border: 1px solid rgba(34,211,238,.18);
          border-radius: 10px; padding: 10px 12px;
        }
        .pw-head { display: flex; align-items: center; gap: 8px; }
        .pw-name { font-size: 15px; font-weight: 700; color: #e2e8f0; }
        .pw-tag { font-size: 11px; color: #67e8f9; background: rgba(34,211,238,.12); border-radius: 8px; padding: 1px 8px; }
        .pw-done { font-size: 11px; color: #34d399; margin-left: auto; border: 1px solid rgba(52,211,153,.4); border-radius: 8px; padding: 1px 8px; }
        .pw-school { font-size: 12px; color: #94a3b8; margin: 4px 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pw-steps { display: flex; align-items: center; }
        .pw-step { display: flex; align-items: center; flex: 1; position: relative; }
        .pw-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; z-index: 1; }
        .pw-label { font-size: 10px; margin-left: 4px; white-space: nowrap; color: #64748b; }
        .pw-line { position: absolute; left: 12px; right: 0; height: 2px; top: 5px; background: #1e293b; }
        .pw-step.done .pw-dot { background: #34d399; box-shadow: 0 0 8px #34d399; }
        .pw-step.done .pw-label { color: #34d399; }
        .pw-step.done .pw-line { background: #34d399; }
        .pw-step.current .pw-dot { background: #22d3ee; box-shadow: 0 0 10px #22d3ee; animation: pulse 1.2s ease-in-out infinite; }
        .pw-step.current .pw-label { color: #22d3ee; font-weight: 700; }
        .pw-step.todo .pw-dot { background: #334155; }
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: .6; } }
      `}</style>
    </div>
  );
}

// ---------- 自动竖向滚动播报 ----------
function ScrollTicker({ items, render, height = 60, gap = 10 }: { items: any[]; render: (it: any, i: number) => React.ReactNode; height?: number; gap?: number; }) {
  const loop = useMemo(() => (items.length > 3 ? [...items, ...items] : items), [items]);
  const dur = Math.max(15, items.length * 3);
  return (
    <div className="tk" style={{ height }}>
      <div className="tk-track" style={{ animationDuration: `${dur}s`, gap: `${gap}px` }}>
        {loop.map((it, i) => (
          <div key={i} className="tk-item">{render(it, i)}</div>
        ))}
      </div>
      <style jsx>{`
        .tk { overflow: hidden; height: 100%; }
        .tk-track { display: flex; flex-direction: column; animation: tkscroll linear infinite; }
        @keyframes tkscroll { from { transform: translateY(0); } to { transform: translateY(-50%); } }
        .tk-item { flex-shrink: 0; }
      `}</style>
    </div>
  );
}

export default function BigScreenPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());
  const [countdown, setCountdown] = useState(30);
  const [auto, setAuto] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [dRes, pRes] = await Promise.all([
        fetch("/api/dashboard", { cache: "no-store" }),
        fetch("/api/bi/applications-progress", { cache: "no-store" }),
      ]);
      setData(await dRes.json());
      setProgress(await pRes.json());
      setLastUpdated(new Date());
    } catch { /* keep old */ }
    finally { setLoading(false); setCountdown(30); }
  }, []);

  useEffect(() => {
    fetchData();
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, [fetchData]);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { fetchData(); return 30; } return c - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [auto, fetchData]);

  const contractsOption: echarts.EChartsOption = data ? {
    grid: { top: 40, left: 50, right: 20, bottom: 30 },
    tooltip: { trigger: "axis", backgroundColor: "rgba(8,15,30,.9)", borderColor: C.cyan, textStyle: { color: "#cbd5e1" } },
    legend: { data: ["合同数", "合同金额"], textStyle: { color: "#94a3b8" }, top: 0 },
    xAxis: { type: "category", data: data.contractsByMonth.map((c) => c.month), axisLine: { lineStyle: { color: "#334155" } }, axisLabel: { color: "#94a3b8" } },
    yAxis: [
      { type: "value", name: "合同数", axisLabel: { color: "#94a3b8" }, splitLine: { lineStyle: { color: "rgba(51,65,85,.4)" } } },
      { type: "value", name: "金额(万)", axisLabel: { color: "#94a3b8" }, splitLine: { show: false } },
    ],
    series: [
      { name: "合同数", type: "bar", data: data.contractsByMonth.map((c) => c.count), barWidth: "40%",
        itemStyle: { borderRadius: [4, 4, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: C.cyan }, { offset: 1, color: "rgba(34,211,238,.15)" }]) },
        animationDuration: 1500, animationEasing: "elasticOut" },
      { name: "合同金额", type: "line", yAxisIndex: 1, smooth: true, data: data.contractsByMonth.map((c) => +(c.amount / 10000).toFixed(1)),
        lineStyle: { width: 3, color: C.orange, shadowColor: C.orange, shadowBlur: 10 }, itemStyle: { color: C.orange },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(251,191,36,.35)" }, { offset: 1, color: "rgba(251,191,36,0)" }]) },
        animationDuration: 1500 },
    ],
  } : {};

  const businessPieOption: echarts.EChartsOption = data ? {
    tooltip: { trigger: "item", backgroundColor: "rgba(8,15,30,.9)", borderColor: C.cyan, textStyle: { color: "#cbd5e1" }, formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, textStyle: { color: "#94a3b8" }, type: "scroll" },
    series: [{
      type: "pie", radius: ["42%", "70%"], center: ["50%", "45%"], roseType: "radius",
      itemStyle: { borderRadius: 6, borderColor: "#0b1220", borderWidth: 2 },
      label: { color: "#cbd5e1", formatter: "{b}\n{d}%" },
      data: data.contractsByBusinessLine.map((b, i) => ({ name: b.label, value: b.value, itemStyle: { color: PALETTE[i % PALETTE.length] } })),
      animationType: "scale", animationEasing: "elasticOut", animationDelay: (i: number) => i * 80,
    }],
  } : {};

  const paymentsOption: echarts.EChartsOption = data ? {
    grid: { top: 30, left: 50, right: 20, bottom: 30 },
    tooltip: { trigger: "axis", backgroundColor: "rgba(8,15,30,.9)", borderColor: C.cyan, textStyle: { color: "#cbd5e1" }, formatter: (p: any) => `${p[0].name}<br/>回款 ${fmtMoney(p[0].value)}` },
    xAxis: { type: "category", data: data.paymentsByMonth.map((p) => p.label), axisLine: { lineStyle: { color: "#334155" } }, axisLabel: { color: "#94a3b8" } },
    yAxis: { type: "value", axisLabel: { color: "#94a3b8", formatter: (v: number) => v / 10000 + "万" }, splitLine: { lineStyle: { color: "rgba(51,65,85,.4)" } } },
    series: [{
      type: "bar", data: data.paymentsByMonth.map((p) => p.value), barWidth: "45%",
      itemStyle: { borderRadius: [4, 4, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: C.purple }, { offset: 1, color: "rgba(168,85,247,.12)" }]) },
      animationDuration: 1500, animationEasing: "cubicOut",
    }],
  } : {};

  const sourceRoseOption: echarts.EChartsOption = data ? {
    tooltip: { trigger: "item", backgroundColor: "rgba(8,15,30,.9)", borderColor: C.cyan, textStyle: { color: "#cbd5e1" } },
    series: [{
      type: "pie", radius: ["32%", "65%"], center: ["50%", "50%"],
      itemStyle: { borderRadius: 4, borderColor: "#0b1220", borderWidth: 2 }, label: { color: "#cbd5e1" },
      data: (data.leadsBySource || []).map((s, i) => ({ name: s.label, value: s.value, itemStyle: { color: PALETTE[i % PALETTE.length] } })),
      animationType: "scale", animationEasing: "elasticOut",
    }],
  } : {};

  const kpis = data ? [
    { label: "今日新增线索", value: data.todayNewLeads, unit: "", color: C.cyan, icon: "📥" },
    { label: "待跟进线索", value: data.pendingFollowLeads, unit: "", color: C.orange, icon: "⏳" },
    { label: "今日访问量", value: data.todayVisits, unit: "", color: C.green, icon: "👁" },
    { label: "本年完成率", value: data.finance?.completionRate || data.yearCompletionRate, unit: "%", decimals: 1, color: C.purple, icon: "🎯" },
    { label: "累计学生", value: data.totalStudents, unit: "", color: C.blue, icon: "🎓" },
    { label: "累计线索", value: data.totalLeads, unit: "", color: C.pink, icon: "📊" },
    { label: "本月合同数", value: data.monthContracts, unit: "", color: C.cyan, icon: "📝" },
    { label: "本月回款", value: data.monthPaymentAmount / 10000, unit: "万", decimals: 1, color: C.green, icon: "💰" },
  ] : [];

  const progressNodes = progress?.nodes || ["材料准备", "递交申请", "递交签证", "到校注册", "结案"];
  const nodeCounts = progress?.nodeCounts || [0, 0, 0, 0, 0];
  const maxNode = Math.max(1, ...nodeCounts);

  return (
    <div className="bigscreen">
      <header className="bs-header">
        <div className="bs-header-side bs-clock">
          <div className="bs-time">{now.toLocaleTimeString("zh-CN", { hour12: false })}</div>
          <div className="bs-date">{now.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</div>
        </div>
        <h1 className="bs-title">
          <span className="bs-title-main">新辰留学 · 实时经营大屏</span>
          <span className="bs-title-sub">XINCHEN ERP REAL-TIME DASHBOARD</span>
        </h1>
        <div className="bs-header-side bs-status">
          <button className="bs-auto" onClick={() => setAuto((a) => !a)}>{auto ? "● 自动刷新" : "○ 已暂停"}</button>
          <div className="bs-update">
            {lastUpdated ? `更新 ${lastUpdated.toLocaleTimeString("zh-CN", { hour12: false })}` : "加载中…"}
            {auto && <span className="bs-count">{countdown}s</span>}
          </div>
          {loading && <span className="bs-loading">⟳</span>}
        </div>
      </header>

      {/* 5 节点进度漏斗 */}
      {progress && (
        <section className="bs-funnel">
          {progressNodes.map((n, i) => (
            <div className="bs-fn" key={i}>
              <div className="bs-fn-top">
                <span className="bs-fn-num" style={{ color: PALETTE[i % PALETTE.length] }}>
                  <AnimatedNumber value={nodeCounts[i]} />
                </span>
                <span className="bs-fn-lbl">{n}</span>
              </div>
              <div className="bs-fn-bar">
                <span className="bs-fn-fill" style={{ width: `${(nodeCounts[i] / maxNode) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
              </div>
            </div>
          ))}
          <div className="bs-fn bs-fn-closed">
            <div className="bs-fn-top">
              <span className="bs-fn-num" style={{ color: C.green }}><AnimatedNumber value={progress.closedCount} /></span>
              <span className="bs-fn-lbl">已结案</span>
            </div>
            <div className="bs-fn-bar">
              <span className="bs-fn-fill" style={{ width: `${(progress.closedCount / Math.max(1, progress.total)) * 100}%`, background: C.green }} />
            </div>
          </div>
        </section>
      )}

      <section className="bs-kpis">
        {kpis.map((k, i) => (
          <div className="bs-kpi" key={i} style={{ borderColor: k.color }}>
            <div className="bs-kpi-icon" style={{ color: k.color }}>{k.icon}</div>
            <div className="bs-kpi-body">
              <div className="bs-kpi-value" style={{ color: k.color }}>
                <AnimatedNumber value={k.value} decimals={k.decimals || 0} /><span className="bs-kpi-unit">{k.unit}</span>
              </div>
              <div className="bs-kpi-label">{k.label}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="bs-grid">
        {/* 左列：申请进度滚动墙（主视觉） */}
        <div className="bs-col bs-col-wall">
          <Panel title={`学生申请进度 · 滚动监控（${progress?.total ?? 0} 个申请）`} accent={C.cyan}>
            {progress ? <ProgressWall data={progress} /> : <div className="bs-loading">⟳ 加载中</div>}
          </Panel>
        </div>

        {/* 中列 */}
        <div className="bs-col">
          <Panel title="月度合同趋势（数量 / 金额）" accent={C.cyan}>
            <EChart option={contractsOption} height={280} />
          </Panel>
          <Panel title="各业务线合同分布" accent={C.purple}>
            <EChart option={businessPieOption} height={240} />
          </Panel>
        </div>

        {/* 右列 */}
        <div className="bs-col">
          <Panel title="月度回款走势" accent={C.purple}>
            <EChart option={paymentsOption} height={240} />
          </Panel>
          <Panel title="线索来源分布" accent={C.blue}>
            <EChart option={sourceRoseOption} height={260} />
          </Panel>
        </div>
      </section>

      <style jsx>{`
        .bigscreen { min-height: 100vh; background: radial-gradient(1200px 600px at 50% -10%, #0e2747 0%, #060d1a 55%, #03060f 100%); color: #e2e8f0; padding: 16px 20px 24px; font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; overflow-x: hidden; }
        .bs-header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; border-bottom: 1px solid rgba(34,211,238,.25); padding-bottom: 10px; position: relative; }
        .bs-header::after { content: ""; position: absolute; bottom: -1px; left: 10%; width: 80%; height: 2px; background: linear-gradient(90deg, transparent, #22d3ee, transparent); animation: scan 4s linear infinite; }
        @keyframes scan { 0% { transform: translateX(-30%); opacity: .3; } 50% { opacity: 1; } 100% { transform: translateX(30%); opacity: .3; } }
        .bs-title { text-align: center; margin: 0; }
        .bs-title-main { display: block; font-size: 28px; font-weight: 800; letter-spacing: 4px; background: linear-gradient(90deg, #67e8f9, #a5b4fc, #67e8f9); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 18px rgba(34,211,238,.35); }
        .bs-title-sub { font-size: 11px; letter-spacing: 3px; color: #475569; }
        .bs-header-side { display: flex; flex-direction: column; gap: 2px; }
        .bs-clock { align-items: flex-start; }
        .bs-time { font-size: 22px; font-weight: 700; color: #22d3ee; font-variant-numeric: tabular-nums; }
        .bs-date { font-size: 12px; color: #64748b; }
        .bs-status { align-items: flex-end; }
        .bs-auto { background: rgba(34,211,238,.1); border: 1px solid rgba(34,211,238,.4); color: #22d3ee; border-radius: 14px; padding: 3px 12px; font-size: 12px; cursor: pointer; }
        .bs-update { font-size: 12px; color: #64748b; display: flex; gap: 6px; align-items: center; }
        .bs-count { background: rgba(52,211,153,.15); color: #34d399; border-radius: 8px; padding: 0 6px; }
        .bs-loading { color: #22d3ee; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .bs-funnel { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin: 14px 0; }
        .bs-fn { background: linear-gradient(160deg, rgba(15,23,42,.9), rgba(15,23,42,.5)); border: 1px solid rgba(51,65,85,.6); border-radius: 12px; padding: 10px 12px; }
        .bs-fn-top { display: flex; align-items: baseline; gap: 6px; margin-bottom: 8px; }
        .bs-fn-num { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; }
        .bs-fn-lbl { font-size: 13px; color: #cbd5e1; }
        .bs-fn-bar { height: 8px; background: rgba(51,65,85,.4); border-radius: 4px; overflow: hidden; }
        .bs-fn-fill { display: block; height: 100%; border-radius: 4px; transition: width 1s cubic-bezier(.22,1,.36,1); box-shadow: 0 0 10px currentColor; }

        .bs-kpis { display: grid; grid-template-columns: repeat(8, 1fr); gap: 12px; margin: 14px 0; }
        .bs-kpi { background: linear-gradient(160deg, rgba(15,23,42,.9), rgba(15,23,42,.5)); border: 1px solid rgba(51,65,85,.6); border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; position: relative; overflow: hidden; box-shadow: inset 0 0 20px rgba(34,211,238,.05); }
        .bs-kpi::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, transparent, currentColor, transparent); opacity: .6; }
        .bs-kpi-icon { font-size: 26px; filter: drop-shadow(0 0 6px currentColor); }
        .bs-kpi-value { font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1; }
        .bs-kpi-unit { font-size: 13px; font-weight: 500; margin-left: 2px; opacity: .8; }
        .bs-kpi-label { font-size: 12px; color: #94a3b8; margin-top: 4px; }

        .bs-grid { display: grid; grid-template-columns: 1.15fr 1fr 1fr; gap: 14px; }
        .bs-col { display: flex; flex-direction: column; gap: 14px; }
        .bs-col-wall :global(.bs-panel-body) { height: 560px; }
      `}</style>
    </div>
  );
}

// ---------- 面板容器 ----------
function Panel({ title, accent, children }: { title: string; accent: string; children: React.ReactNode; }) {
  return (
    <div className="bs-panel">
      <div className="bs-panel-head" style={{ borderColor: accent }}>
        <span className="bs-panel-dot" style={{ background: accent }} />
        <span className="bs-panel-title">{title}</span>
      </div>
      <div className="bs-panel-body">{children}</div>
      <style jsx>{`
        .bs-panel { background: linear-gradient(160deg, rgba(15,23,42,.85), rgba(8,12,22,.7)); border: 1px solid rgba(51,65,85,.5); border-radius: 12px; padding: 12px 14px 14px; position: relative; box-shadow: 0 4px 24px rgba(0,0,0,.3); }
        .bs-panel::after { content: ""; position: absolute; top: 8px; right: 8px; width: 14px; height: 14px; border-top: 2px solid rgba(34,211,238,.4); border-right: 2px solid rgba(34,211,238,.4); }
        .bs-panel-head { display: flex; align-items: center; gap: 8px; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid rgba(51,65,85,.4); }
        .bs-panel-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 8px currentColor; }
        .bs-panel-title { font-size: 15px; font-weight: 700; color: #e2e8f0; letter-spacing: 1px; }
      `}</style>
    </div>
  );
}
