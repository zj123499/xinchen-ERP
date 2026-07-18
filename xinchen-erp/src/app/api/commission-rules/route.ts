import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = { tenantId };
  if (status === "active") where.status = true;
  if (status === "inactive") where.status = false;

  const list = await prisma.commissionRule.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      configVersion: { select: { id: true, version: true, isActive: true, createdAt: true } },
    },
  });

  return NextResponse.json({ list });
}

export async function POST(request: NextRequest) {
  const { userId, tenantId } = getContext(request);
  const body = await request.json();
  const { name, ruleType, config, effectiveFrom, effectiveTo, remark } = body;

  if (!name) return NextResponse.json({ error: "请填写规则名称" }, { status: 400 });
  if (!ruleType) return NextResponse.json({ error: "请选择规则类型" }, { status: 400 });
  if (config === undefined) return NextResponse.json({ error: "请配置规则内容" }, { status: 400 });

  // 同一租户下同名规则，版本号自增
  const last = await prisma.commissionRule.findFirst({
    where: { tenantId, name },
    orderBy: { version: "desc" },
  });
  const version = (last?.version || 0) + 1;

  // 写配置版本快照
  const configKey = `commission_rule_${name}`;
  const snapshot = await prisma.configVersion.create({
    data: {
      tenantId,
      configType: "COMMISSION_RULE",
      configKey,
      version,
      snapshot: config,
      remark: remark || `初始版本 v${version}`,
      operatorId: userId || null,
      isActive: true,
    },
  });

  // 将历史版本标记为非生效
  await prisma.configVersion.updateMany({
    where: { tenantId, configKey, NOT: { id: snapshot.id } },
    data: { isActive: false },
  });

  const rule = await prisma.commissionRule.create({
    data: {
      tenantId,
      name,
      version,
      ruleType,
      config,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      status: true,
      configVersionId: snapshot.id,
    },
    include: {
      configVersion: { select: { id: true, version: true, isActive: true } },
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
