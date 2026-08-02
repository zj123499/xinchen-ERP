import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

export async function PUT(request: NextRequest) {
  // 二次验证：从 cookie 或 Authorization 中获取 token 并校验
  const token = request.cookies.get("token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");
  const payload = token ? await verifyToken(token) : null;
  const userId = payload?.userId || request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { realName, email, phone } = body;

    const user = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        realName: realName || undefined,
        email: email || undefined,
        phone: phone || undefined,
      },
      select: {
        id: true,
        username: true,
        realName: true,
        email: true,
        phone: true,
      },
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "更新用户信息失败" }, { status: 500 });
  }
}
