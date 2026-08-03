export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const tenantId = parseInt(request.headers.get("x-tenant-id") || "0");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // 速率限制：同一用户每分钟最多3次密码修改尝试
  const rate = checkRateLimit(`chpwd:${userId}`, 3, 60_000);
  if (rate.limited) {
    return NextResponse.json({ error: "操作过于频繁，请1分钟后再试" }, { status: 429 });
  }

  const { oldPassword, newPassword } = await request.json();
  if (!oldPassword || !newPassword) {
    return NextResponse.json({ error: "请填写原密码和新密码" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "新密码至少 8 位" }, { status: 400 });
  }
  if (!/[A-Z]/.test(newPassword) && !/[a-z]/.test(newPassword)) {
    return NextResponse.json({ error: "密码需包含至少一个字母" }, { status: 400 });
  }
  if (!/[0-9]/.test(newPassword)) {
    return NextResponse.json({ error: "密码需包含至少一个数字" }, { status: 400 });
  }

  // 确保只能修改自己租户内的用户
  const user = await prisma.user.findFirst({
    where: { id: parseInt(userId), tenantId },
  });
  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  const ok = await verifyPassword(oldPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "原密码不正确" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
      isDefaultPassword: false,
    },
  });

  return NextResponse.json({ success: true });
}
