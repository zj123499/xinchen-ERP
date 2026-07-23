/**
 * 风险规则 API（风险管理中心）
 * GET  /api/risk-rules - 规则列表（支持启用筛选）
 * POST /api/risk-rules - 新增风险规则
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
  const { tenantId } = getContext(request);
  const url = new URL(request.url);
  const enabled = url.searchParams.get("enabled");

  const where: Prisma.RiskRuleWhereInput = { tenantId };
  if (enabled === "true") where.enabled = true;
  if (enabled === "false") where.enabled = false;

  const list = await prisma.riskRule.findMany({
    where,
    include: { _count: { select: { records: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ list });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { name, description, conditionExpr, riskLevel, notifyRoles } = body;

  if (!name || !conditionExpr) {
    return NextResponse.json({ error: "规则名称与条件表达式为必填项" }, { status: 400 });
  }

  const rule = await prisma.riskRule.create({
    data: {
      tenantId,
      name,
      description: description || null,
      conditionExpr,
      riskLevel: riskLevel || "MEDIUM",
      notifyRoles: notifyRoles || null,
      enabled: body.enabled !== false,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
