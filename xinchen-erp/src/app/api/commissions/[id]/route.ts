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
  const { id } = await params;

  const commission = await prisma.commission.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      rule: { select: { id: true, name: true, ruleType: true, config: true } },
    },
  });
  if (!commission) return NextResponse.json({ error: "提成记录不存在" }, { status: 404 });
  return NextResponse.json(commission);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const {
    amount, status, milestoneKey, releaseRatio, fiscalYear, fiscalMonth,
    studentId, ruleId, orderId, employeeId,
  } = body;

  const existing = await prisma.commission.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "提成记录不存在" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (studentId !== undefined) updateData.studentId = parseInt(studentId);
  if (ruleId !== undefined) updateData.ruleId = parseInt(ruleId);
  if (orderId !== undefined) updateData.orderId = orderId ? parseInt(orderId) : null;
  if (employeeId !== undefined) updateData.employeeId = parseInt(employeeId);
  if (amount !== undefined) updateData.amount = parseFloat(amount);
  if (status) {
    updateData.status = status;
    if (status === "RELEASED") {
      updateData.releasedAt = new Date();
      // 若未显式传比例，按里程碑在规则配置中的比例自动计算（分段提成释放引擎）
      let ratio = releaseRatio ? parseFloat(releaseRatio) : 1;
      if (!releaseRatio && milestoneKey) {
        const rule = await prisma.commissionRule.findFirst({
          where: { id: existing.ruleId },
          select: { config: true },
        });
        const cfg = (rule?.config as Record<string, unknown>) || {};
        const milestones = (cfg.milestones as Array<{ key: string; ratio: number }>) || [];
        const m = milestones.find((x) => x.key === milestoneKey);
        if (m) ratio = m.ratio;
      }
      updateData.releaseRatio = ratio;
      // 记录实际释放金额 = 应发金额 * 释放比例
      updateData.amount = Number(existing.amount) * ratio;
    }
  }
  if (milestoneKey !== undefined) updateData.milestoneKey = milestoneKey;
  if (fiscalYear) updateData.fiscalYear = parseInt(fiscalYear);
  if (fiscalMonth) updateData.fiscalMonth = parseInt(fiscalMonth);

  const commission = await prisma.commission.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      student: { select: { id: true, name: true, phone: true } },
      rule: { select: { id: true, name: true, ruleType: true } },
    },
  });

  return NextResponse.json(commission);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.commission.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "提成记录不存在" }, { status: 404 });

  await prisma.commission.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
