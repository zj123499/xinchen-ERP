/**
 * 简单内存速率限制器
 * 用于保护登录/密码修改等接口免受暴力破解
 */
const store = new Map<string, { count: number; resetAt: number }>();

// 每 60 秒清理一次过期记录
setInterval(() => {
  const now = Date.now();
  for (const [key, v] of store) {
    if (v.resetAt < now) store.delete(key);
  }
}, 60_000);

/**
 * 检查是否触发速率限制
 * @param key - 标识键（如 ip:username）
 * @param maxAttempts - 最大尝试次数
 * @param windowMs - 时间窗口（毫秒）
 * @returns { limited: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60_000
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: maxAttempts - 1, resetAt: now + windowMs };
  }

  entry.count++;
  const remaining = maxAttempts - entry.count;
  return {
    limited: entry.count > maxAttempts,
    remaining: Math.max(0, remaining),
    resetAt: entry.resetAt,
  };
}
