import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

  // 验证 token 有效性，防止恶意设置任意 cookie
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const redirectTo = request.nextUrl.searchParams.get("r") || "/";
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
