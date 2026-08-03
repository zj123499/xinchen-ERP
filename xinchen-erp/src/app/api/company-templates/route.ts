export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";
import { encrypt } from "@/lib/crypto";
export async function GET(request: NextRequest) {
  const _denied = await requirePermission(request, "company_templates:view");
  if (_denied) return _denied;
  const { tenantId } = getServerContext(request);
  return NextResponse.json({ list: [], total: 0 });
}
export async function POST(request: NextRequest) {
  return NextResponse.json({}, { status: 201 });
}
