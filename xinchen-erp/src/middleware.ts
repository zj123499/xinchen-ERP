import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/dingtalk/callback",
  "/api/dingtalk/login",
  "/api/health",
  "/login",
  "/_next",
  "/favicon.ico",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路径放行
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 获取 token：优先 Authorization header，回退到 cookie
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.replace("Bearer ", "");

  // 优先用内置 cookies API；Next 16 standalone 下 cookies API 有时取不到，
  // 兜底从原始 Cookie header 手动解析，保证浏览器 cookie 登录可用
  let cookieToken = request.cookies.get("token")?.value;
  if (!cookieToken) {
    const rawCookie = request.headers.get("cookie") || "";
    const match = rawCookie.match(/(?:^|;\s*)token=([^;]+)/);
    cookieToken = match ? decodeURIComponent(match[1]) : undefined;
  }

  const token = bearerToken || cookieToken;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Token 已过期" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 注入用户信息到 headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", String(payload.userId));
  requestHeaders.set("x-tenant-id", String(payload.tenantId));
  requestHeaders.set("x-user-roles", payload.roles.join(","));

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
