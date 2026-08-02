/**
 * 风险通知 API（风险管理中心）
 * GET /api/risk-notifications - 风险通知列表（按已读筛选）
 * POST /api/risk-notifications/:id/read - 标记已读
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";
import { Prisma } from "@prisma/client";


export async function GET(request: NextRequest) {

const _denied = await requirePermission(request, "risk:view");

if (_denied) return _denied;


  const { tenantId } = getServerContext(request);
  const url = new URL(request.url);
  const unread = url.searchParams.get("unread") === "1";
  const limit = parseInt(url.searchParams.get("limit") || "50");

  const where: Prisma.RiskNotificationWhereInput = { tenantId };
  if (unread) where.read = false;

  const list = await prisma.riskNotification.findMany({
    where,
    include: { riskRecord: { select: { id: true, riskLevel: true, status: true } } },
    orderBy: { sentAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ list });
}
