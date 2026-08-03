/**
 * BI 数据大屏
 * echarts 加载优化: 使用 next/dynamic 进一步优化可参考 ScreenClient.tsx
 */
import dynamic from "next/dynamic";

const ScreenClient = dynamic(() => import("./ScreenClient"), { ssr: false });

export default function BigScreenPage() {
  return <ScreenClient />;
}
