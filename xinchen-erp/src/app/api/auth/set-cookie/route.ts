import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

// 白名单：只允许相对路径，防止开放重定向
function isValidRedirect(path: string): boolean {
  if (path === "/") return true;
  return path.startsWith("/") && !path.startsWith("//") && !path.includes(":");
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

  // 验证 token 有效性，防止恶意设置任意 cookie
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const redirectTo = request.nextUrl.searchParams.get("r") || "/";
  const safeRedirect = isValidRedirect(redirectTo) ? redirectTo : "/";
  const isSecure = (request.headers.get("x-forwarded-proto") || "") === "https";
  const response = NextResponse.redirect(new URL(safeRedirect, request.url));
  response.cookies.set("token", token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return response;
}
