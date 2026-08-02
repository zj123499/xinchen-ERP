/**
 * 路由级加载状态
 * 页面/layout 加载时的骨架屏，避免白屏闪烁
 */
export default function MainLoading() {
  return (
    <div className="flex-1 p-6 bg-slate-50 min-h-screen">
      <div className="animate-pulse space-y-6">
        {/* 标题区域 */}
        <div className="flex-between">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-9 bg-slate-200 rounded-lg w-28" />
        </div>
        {/* 表格区域 */}
        <div className="card">
          <div className="flex-between mb-4">
            <div className="h-5 bg-slate-200 rounded w-32" />
            <div className="h-9 bg-slate-200 rounded-lg w-64" />
          </div>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded" style={{ opacity: 1 - i * 0.1 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
