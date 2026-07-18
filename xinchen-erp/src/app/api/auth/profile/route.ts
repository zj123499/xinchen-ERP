import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
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
  } catch (err) {
    console.error("更新用户信息失败", err);
    return NextResponse.json({ error: "更新用户信息失败" }, { status: 500 });
  }
}
