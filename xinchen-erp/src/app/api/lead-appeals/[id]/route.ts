/**
 * 线索申诉审批 API
 * PUT /api/lead-appeals/[id]  - 审批申诉
 *   body: { status: APPROVED|REJECTED, reviewNote }
 *   审批通过时：写流转日志并将线索归属转给申诉人
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const status = body.status;
  const reviewNote = body.reviewNote || null;

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "审批结果无效" }, { status: 400 });
  }

  const appeal = await prisma.leadAppeal.findFirst({
    where: { id: parseInt(id), lead: { tenantId } },
    include: { lead: true },
  });
  if (!appeal) return NextResponse.json({ error: "申诉不存在" }, { status: 404 });
  if (appeal.status !== "PENDING") {
    return NextResponse.json({ error: "该申诉已审批，无法重复操作" }, { status: 400 });
  }

  const ops: any[] = [
    prisma.leadAppeal.update({
      where: { id: appeal.id },
      data: { status, reviewNote, reviewedBy: userId, reviewedAt: new Date() },
    }),
  ];

  // 审批通过：将线索归属转给申诉人，并写流转日志
  if (status === "APPROVED" && appeal.lead.assignedToId !== appeal.appellantId) {
    ops.push(
      prisma.leadTransferLog.create({
        data: {
          leadId: appeal.leadId,
          fromUserId: appeal.lead.assignedToId,
          toUserId: appeal.appellantId,
          reason: `申诉通过转移：${appeal.reason}`,
        },
      }),
      prisma.lead.update({
        where: { id: appeal.leadId },
        data: { assignedToId: appeal.appellantId },
      })
    );
  }

  const [updated] = await prisma.$transaction(ops);
  return NextResponse.json(updated);
}
