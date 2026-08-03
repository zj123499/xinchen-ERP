/**
 * BI 数据大屏 — 禁止 SSR 避免 hydration mismatch (#418)
 */
import dynamic from "next/dynamic";

const ScreenClient = dynamic(() => import("./ScreenClient"), { ssr: false });

export default function BigScreenPage() {
  return <ScreenClient />;
}
