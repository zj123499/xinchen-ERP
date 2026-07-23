/**
 * 审批记录 API（审批流引擎）
 * GET  /api/approval-records?scope=pending|mine|all - 列表
 * POST /api/approval-records - 提交审批（按业务类型找到审批流并建首节点记录）
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { userId, tenantId } = getContext(request);
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") || "pending";
  const status = url.searchParams.get("status") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");

  const where: Prisma.ApprovalRecordWhereInput = { tenantId };
  if (status) where.status = status as Prisma.EnumApprovalStatusFilter["equals"];
  if (scope === "pending") where.approverId = userId;
  if (scope === "mine") where.applicantId = userId;

  const [total, list] = await Promise.all([
    prisma.approvalRecord.count({ where }),
    prisma.approvalRecord.findMany({
      where,
      include: {
        flow: { select: { id: true, name: true, businessType: true } },
        node: { select: { id: true, name: true, orderNo: true, nodeType: true } },
      },
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), list });
}

export async function POST(request: NextRequest) {
  const { userId, tenantId } = getContext(request);
  const body = await request.json();
  const { businessType, businessId, comment, attachments } = body;

  if (!businessType || !businessId) {
    return NextResponse.json({ error: "业务类型和业务ID为必填项" }, { status: 400 });
  }

  const flow = await prisma.approvalFlow.findFirst({
    where: { tenantId, businessType, enabled: true },
    include: { nodes: { orderBy: { orderNo: "asc" } } },
  });
  if (!flow || flow.nodes.length === 0) {
    return NextResponse.json({ error: "未配置可用的审批流" }, { status: 400 });
  }

  const firstNode = flow.nodes[0];

  const record = await prisma.approvalRecord.create({
    data: {
      tenantId,
      flowId: flow.id,
      nodeId: firstNode.id,
      businessType,
      businessId: parseInt(businessId),
      applicantId: userId,
      approverId: firstNode.approverId,
      status: "PENDING",
      comment: comment || null,
      attachments: attachments || null,
      currentNodeOrder: firstNode.orderNo,
    },
    include: {
      flow: { select: { name: true, businessType: true } },
      node: { select: { name: true, orderNo: true } },
    },
  });

  // 通知首节点审批人
  if (firstNode.approverId) {
    await prisma.notification.create({
      data: {
        userId: firstNode.approverId,
        title: `待审批：${flow.name}`,
        content: `您有一条${flow.name}审批待处理${comment ? `（备注：${comment}）` : ""}`,
        type: "approval",
        link: `/approval-records`,
      },
    }).catch(() => {});
  }

  return NextResponse.json(record, { status: 201 });
}
