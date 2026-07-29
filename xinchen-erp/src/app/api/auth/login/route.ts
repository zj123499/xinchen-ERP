import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { signToken } from "@/lib/jwt";
import { recordLogin } from "@/lib/operation-log";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let username = "";
    let password = "";
    let redirectTo = "/";
    let isFormSubmit = false;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      username = body.username;
      password = body.password;
    } else {
      isFormSubmit = true;
      // 支持 form-urlencoded 和 multipart/form-data
      const formData = await request.formData();
      username = (formData.get("username") as string) || "";
      password = (formData.get("password") as string) || "";
      redirectTo = (formData.get("redirect") as string) || "/";
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = request.headers.get("user-agent") || null;
    const FALLBACK_TENANT = 1;

    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { phone: username }] },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || !user.isActive) {
      await recordLogin({ tenantId: FALLBACK_TENANT, username, status: "FAILED", reason: "用户不存在或已禁用", ipAddress: ip, userAgent: ua });
      if (isFormSubmit) return NextResponse.redirect(new URL("/login?error=1", request.url));
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await recordLogin({ tenantId: user.tenantId, userId: user.id, username, status: "FAILED", reason: "密码错误", ipAddress: ip, userAgent: ua });
      if (isFormSubmit) return NextResponse.redirect(new URL("/login?error=1", request.url));
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const roles = user.userRoles.map((ur) => ur.role.code);
    const token = await signToken({ userId: user.id, tenantId: user.tenantId, username: user.username, roles });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await recordLogin({ tenantId: user.tenantId, userId: user.id, username: user.username, status: "SUCCESS", ipAddress: ip, userAgent: ua });

    // Form POST: 302 重定向到首页，同时 Set-Cookie
    if (isFormSubmit) {
      const response = NextResponse.redirect(new URL(redirectTo, request.url));
      response.cookies.set("token", token, {
        httpOnly: false,
        secure: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 8,
        path: "/",
      });
      return response;
    }

    // JSON fetch: 返回 token
    const response = NextResponse.json({
      token,
      user: { id: user.id, username: user.username, realName: user.realName, email: user.email, avatar: user.avatar, mustChangePassword: user.mustChangePassword, roles },
    });
    response.cookies.set("token", token, {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
