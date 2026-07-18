/**
 * 审批决定 API（审批流引擎）
 * POST /api/approval-records/:id/decide - 通过 / 驳回 / 转审
 *      body: { action: "APPROVE"|"REJECT"|"TRANSFER", comment, transferToId }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { applyApproved, applyRejected } from "@/lib/approvalBusiness";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { action, comment, transferToId } = body;

  const record = await prisma.approvalRecord.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      flow: { include: { nodes: { orderBy: { orderNo: "asc" } } } },
    },
  });
  if (!record) return NextResponse.json({ error: "审批记录不存在" }, { status: 404 });
  if (record.status !== "PENDING") return NextResponse.json({ error: "该审批已处理" }, { status: 400 });
  if (record.approverId && record.approverId !== userId) {
    return NextResponse.json({ error: "您不是当前节点审批人" }, { status: 403 });
  }

  if (action === "REJECT") {
    const updated = await prisma.approvalRecord.update({
      where: { id: parseInt(id) },
      data: { status: "REJECTED", comment: comment || record.comment, approverId: userId, decidedAt: new Date() },
    });
    // 回写业务：驳回
    await applyRejected(prisma, record.businessType, record.businessId).catch(() => {});
    await notifyApplicant(prisma, record, "已被驳回", comment);
    return NextResponse.json(updated);
  }

  if (action === "TRANSFER") {
    if (!transferToId) return NextResponse.json({ error: "请指定转审人" }, { status: 400 });
    const updated = await prisma.approvalRecord.update({
      where: { id: parseInt(id) },
      data: { status: "TRANSFERRED", approverId: parseInt(transferToId), comment: comment || record.comment },
    });
    await prisma.notification.create({
      data: {
        userId: parseInt(transferToId),
        title: `转审：${record.flow.name}`,
        content: `一条审批已转交给您处理`,
        type: "approval",
        link: `/approval-records`,
      },
    }).catch(() => {});
    return NextResponse.json(updated);
  }

  if (action === "APPROVE") {
    // 找到当前节点在流中的序号
    const nodes = record.flow.nodes;
    const currentIdx = nodes.findIndex((n) => n.orderNo === record.currentNodeOrder);
    const isLast = currentIdx === nodes.length - 1;

    if (isLast) {
      const updated = await prisma.approvalRecord.update({
        where: { id: parseInt(id) },
        data: { status: "APPROVED", approverId: userId, comment: comment || record.comment, decidedAt: new Date() },
      });
      // 回写业务：审批通过
      await applyApproved(prisma, record.businessType, record.businessId).catch(() => {});
      await notifyApplicant(prisma, record, "已通过", comment);
      return NextResponse.json(updated);
    }

    // 流转到下一节点
    const nextNode = nodes[currentIdx + 1];
    const updated = await prisma.approvalRecord.update({
      where: { id: parseInt(id) },
      data: { nodeId: nextNode.id, approverId: nextNode.approverId, currentNodeOrder: nextNode.orderNo, comment: comment || record.comment },
    });
    if (nextNode.approverId) {
      await prisma.notification.create({
        data: {
          userId: nextNode.approverId,
          title: `待审批：${record.flow.name}`,
          content: `您有一条审批待处理（第 ${nextNode.orderNo} 节点）`,
          type: "approval",
          link: `/approval-records`,
        },
      }).catch(() => {});
    }
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}

async function notifyApplicant(db: PrismaClient, record: { applicantId: number; flow: { name: string } }, resultText: string, comment?: string) {
  await prisma.notification.create({
    data: {
      userId: record.applicantId,
      title: `审批结果：${record.flow.name}`,
      content: `您的审批${resultText}${comment ? `（${comment}）` : ""}`,
      type: "approval",
      link: `/approval-records`,
    },
  }).catch(() => {});
}
