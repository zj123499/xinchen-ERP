export const dynamic = "force-dynamic";
/**
 * 风险通知标记已读 API
 * POST /api/risk-notifications/:id/read
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";


export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const existing = await prisma.riskNotification.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "通知不存在" }, { status: 404 });
  const notif = await prisma.riskNotification.update({
    where: { id: parseInt(id) },
    data: { read: true },
  });
  return NextResponse.json(notif);
}
