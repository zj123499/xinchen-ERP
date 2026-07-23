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
  const id = parseInt((await params).id);
  const rule = await prisma.commissionRule.findFirst({
    where: { id, tenantId },
    include: { configVersion: true },
  });
  if (!rule) return NextResponse.json({ error: "规则不存在" }, { status: 404 });
  return NextResponse.json(rule);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, tenantId } = getContext(request);
  const id = parseInt((await params).id);
  const body = await request.json().catch(() => ({}) as any);
  const existing = await prisma.commissionRule.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "规则不存在" }, { status: 404 });

  const { name, ruleType, config, effectiveFrom, effectiveTo, status } = body;

  // 计算新版本号
  const maxVersion = await prisma.configVersion.findFirst({
    where: { tenantId, configType: "COMMISSION_RULE", configKey: String(id) },
    orderBy: { version: "desc" },
  });
  const newVersion = (maxVersion?.version || existing.version || 0) + 1;

  const statusVal = body.status;
  const boolStatus =
    typeof statusVal === "boolean"
      ? statusVal
      : statusVal === "启用" || statusVal === "true" || statusVal === true;

  const updated = await prisma.$transaction(async (tx) => {
    const v = await tx.configVersion.create({
      data: {
        tenantId,
        configType: "COMMISSION_RULE",
        configKey: String(id),
        version: newVersion,
        snapshot: (config ?? existing.config) as object,
        remark: `规则更新 v${newVersion}`,
        operatorId: userId > 0 ? userId : null,
      },
    });
    const updatedRule = await tx.commissionRule.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        ruleType: ruleType ?? existing.ruleType,
        config: config ?? existing.config,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : existing.effectiveFrom,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : existing.effectiveTo,
        status: statusVal === undefined ? existing.status : boolStatus,
        version: newVersion,
        configVersionId: v.id,
      },
    });
    return updatedRule;
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const id = parseInt((await params).id);
  const existing = await prisma.commissionRule.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "规则不存在" }, { status: 404 });
  await prisma.commissionRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
