import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

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
