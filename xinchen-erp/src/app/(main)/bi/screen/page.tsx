/**
 * BI 数据大屏 — 通过 next/dynamic 懒加载
 * echarts (~1MB) 仅在大屏页面打开时才下载，不计入首屏体积
 */
import dynamic from "next/dynamic";

const ScreenClient = dynamic(() => import("./ScreenClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-400 text-sm">大屏加载中…</p>
      </div>
    </div>
  ),
});

export default function BigScreenPage() {
  return <ScreenClient />;
}
