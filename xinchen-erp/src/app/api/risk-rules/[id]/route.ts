/**
 * 风险规则详情 API
 * PUT    /api/risk-rules/:id
 * DELETE /api/risk-rules/:id
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";;
import { getContext } from "@/lib/context";
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { name, description, conditionExpr, riskLevel, notifyRoles, enabled } = body;

  const existing = await prisma.riskRule.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "规则不存在" }, { status: 404 });

  const rule = await prisma.riskRule.update({
    where: { id: parseInt(id) },
    data: {
      name: name ?? existing.name,
      description: description === undefined ? existing.description : description || null,
      conditionExpr: conditionExpr ?? existing.conditionExpr,
      riskLevel: riskLevel ?? existing.riskLevel,
      notifyRoles: notifyRoles === undefined ? existing.notifyRoles : notifyRoles || null,
      enabled: enabled === undefined ? existing.enabled : enabled,
    },
  });
  return NextResponse.json(rule);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const existing = await prisma.riskRule.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "规则不存在" }, { status: 404 });
  await prisma.riskRule.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
