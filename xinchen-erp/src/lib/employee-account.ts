import { prisma } from "@/lib/prisma";

/**
 * 解析员工登录账号用户名：
 * - 优先使用显式传入的 username
 * - 否则默认使用手机号作为登录账号（满足「默认手机号登录」需求）
 * 若最终用户名已被占用，追加数字后缀保证唯一（登录仍可用手机号匹配）
 */
export async function resolveAccountUsername(
  desired: string | undefined | null,
  phone: string | undefined | null
): Promise<string | null> {
  const base = (desired && desired.trim()) || (phone && phone.trim()) || "";
  if (!base) return null;
  let candidate = base;
  let suffix = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existed = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existed) return candidate;
    suffix += 1;
    candidate = `${base}_${suffix}`;
    if (suffix > 999) return `${base}_${Date.now()}`;
  }
}
