"use client";

import { memo } from "react";

interface LoadingSpinnerProps {
  text?: string;
  className?: string;
}

/** 统一加载指示器 — 可用于页面级和组件级 loading */
export const LoadingSpinner = memo(function LoadingSpinner({
  text = "加载中…",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full" />
        <span className="text-sm text-slate-500">{text}</span>
      </div>
    </div>
  );
});

/** 全屏加载状态 */
export function PageLoading() {
  return <LoadingSpinner text="页面加载中…" className="min-h-[50vh]" />;
}
