/**
 * 员工异动记录
 * GET /api/employees/[id]/changes - 列出员工异动历史
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  if (!tenantId) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;

  const changes = await prisma.employeeChange.findMany({
    where: { tenantId, employeeId: parseInt(id) },
    orderBy: { createdAt: "desc" },
    include: {
      operator: { select: { realName: true } },
    },
  });

  return NextResponse.json(
    changes.map((c) => ({
      id: c.id,
      fromStatus: c.fromStatus,
      toStatus: c.toStatus,
      changeType: c.changeType,
      reason: c.reason,
      operatorName: c.operator?.realName || "系统",
      createdAt: c.createdAt,
    }))
  );
}
