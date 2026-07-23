/**
 * 审批流定义 API（审批流引擎）
 * GET  /api/approval-flows - 列表
 * POST /api/approval-flows - 新增审批流（含节点数组）
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, ApprovalNodeType } from "@prisma/client";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const url = new URL(request.url);
  const businessType = url.searchParams.get("businessType") || "";

  const where: Prisma.ApprovalFlowWhereInput = { tenantId };
  if (businessType) where.businessType = businessType;

  const list = await prisma.approvalFlow.findMany({
    where,
    include: {
      nodes: { orderBy: { orderNo: "asc" } },
      _count: { select: { records: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ list });
}

export async function POST(request: NextRequest) {
  const { tenantId, userId } = getContext(request);
  const body = await request.json();
  const { name, businessType, description, signMode, enabled, nodes } = body;

  if (!name || !businessType) {
    return NextResponse.json({ error: "审批流名称和业务类型为必填项" }, { status: 400 });
  }

  const existing = await prisma.approvalFlow.findFirst({ where: { tenantId, businessType } });
  if (existing) {
    return NextResponse.json({ error: "该业务类型已存在审批流，请先停用或修改现有流" }, { status: 409 });
  }

  const parsedNodes = Array.isArray(nodes) ? nodes : [];
  if (parsedNodes.length === 0) {
    return NextResponse.json({ error: "至少需要一个审批节点" }, { status: 400 });
  }

  const flow = await prisma.approvalFlow.create({
    data: {
      tenantId,
      name,
      businessType,
      description: description || null,
      signMode: signMode || "AND",
      enabled: enabled !== false,
      nodes: {
        create: parsedNodes.map((n: Record<string, unknown>, i: number) => ({
          nodeType: (n.nodeType as ApprovalNodeType) || "APPROVE",
          orderNo: Number(n.orderNo) || i + 1,
          name: String(n.name),
          approverRole: (n.approverRole as string) || null,
          approverId: n.approverId ? Number(n.approverId) : null,
          conditionExpr: (n.conditionExpr as string) || null,
        })),
      },
    },
    include: { nodes: { orderBy: { orderNo: "asc" } } },
  });

  return NextResponse.json(flow, { status: 201 });
}
