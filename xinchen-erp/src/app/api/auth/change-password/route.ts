import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { oldPassword, newPassword } = await request.json();
  if (!oldPassword || !newPassword) {
    return NextResponse.json({ error: "请填写原密码和新密码" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "新密码至少 6 位" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
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
    },
  });

  return NextResponse.json({ success: true });
}
