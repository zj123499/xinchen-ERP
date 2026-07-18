import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = { tenantId };
  if (status === "active") where.status = true;
  if (status === "inactive") where.status = false;

  const list = await prisma.commissionRule.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ list });
}
