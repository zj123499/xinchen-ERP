import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

export async function GET(request: NextRequest) {
  // 二次验证：从 cookie 或 Authorization 中获取 token 并校验
  const token = request.cookies.get("token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");
  const payload = token ? await verifyToken(token) : null;
  const userId = payload?.userId || request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        username: true,
        realName: true,
        email: true,
        phone: true,
        avatar: true,
        userRoles: {
          include: { role: { select: { name: true } } },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        roles: user.userRoles.map((ur) => ur.role.name),
      },
    });
  } catch {
    return NextResponse.json({ error: "获取用户信息失败" }, { status: 500 });
  }
}
