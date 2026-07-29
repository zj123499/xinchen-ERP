import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/set-cookie",
  "/api/dingtalk/callback",
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

  // 获取 token：优先 Authorization header，回退到 cookie，再回退到 URL _t 参数
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.replace("Bearer ", "");

  let cookieToken = request.cookies.get("token")?.value;
  if (!cookieToken) {
    const rawCookie = request.headers.get("cookie") || "";
    const match = rawCookie.match(/(?:^|;\s*)token=([^;]+)/);
    cookieToken = match ? decodeURIComponent(match[1]) : undefined;
  }

  // 兜底: URL 参数 _t
  const urlToken = request.nextUrl.searchParams.get("_t") || undefined;

  let token = bearerToken || cookieToken || urlToken;

  // 如果通过 _t 参数验证通过，直接放行并设置 cookie（不重定向，避免丢失 cookie）
  if (!cookieToken && urlToken) {
    const payload = await verifyToken(urlToken);
    if (payload) {
      token = urlToken;
    }
  }

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

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // 如果通过 _t 参数登录，在页面响应中设置 cookie
  if (urlToken && !cookieToken) {
    response.cookies.set("token", urlToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
