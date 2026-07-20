import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { signToken } from "@/lib/jwt";
import { recordLogin } from "@/lib/operation-log";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      request.headers.get("x-client-ip") ||
      null;
    const ua = request.headers.get("user-agent") || null;
    // 登录失败且用户不存在时，无租户上下文，回退到默认租户
    const FALLBACK_TENANT = 1;

    // 支持用手机号或用户名登录（默认手机号）
    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { phone: username }] },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      await recordLogin({
        tenantId: FALLBACK_TENANT,
        username,
        status: "FAILED",
        reason: "用户不存在或已禁用",
        ipAddress: ip,
        userAgent: ua,
      });
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await recordLogin({
        tenantId: user.tenantId,
        userId: user.id,
        username,
        status: "FAILED",
        reason: "密码错误",
        ipAddress: ip,
        userAgent: ua,
      });
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const roles = user.userRoles.map((ur) => ur.role.code);

    const token = await signToken({
      userId: user.id,
      tenantId: user.tenantId,
      username: user.username,
      roles,
    });

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await recordLogin({
      tenantId: user.tenantId,
      userId: user.id,
      username: user.username,
      status: "SUCCESS",
      ipAddress: ip,
      userAgent: ua,
    });

    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        email: user.email,
        avatar: user.avatar,
        mustChangePassword: user.mustChangePassword,
        roles,
      },
    });

    // Set cookie for page auth
    // 注意: 当前仅 HTTP 部署，secure 必须为 false
    // HTTPS 部署时改为: process.env.NODE_ENV === "production"
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
