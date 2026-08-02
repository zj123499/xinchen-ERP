import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const _denied = await requirePermission(request, "visit_plans:view");
    if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;

  const plan = await prisma.visitPlan.findFirst({
    where: { id: parseInt(id), student: { tenantId } },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      assignee: { select: { id: true, realName: true, username: true } },
      records: { select: { id: true, visitDate: true, visitType: true, summary: true } },
    },
  });

  if (!plan) return NextResponse.json({ error: "回访计划不存在" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const _denied = await requirePermission(request, "visit_plans:update");
    if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const body = await request.json();
  const { stage, scheduledAt, daysOffset, purpose, assigneeId, status } = body;

  const existing = await prisma.visitPlan.findFirst({
    where: { id: parseInt(id), student: { tenantId } },
  });
  if (!existing) return NextResponse.json({ error: "回访计划不存在" }, { status: 404 });

  const updateData: any = {};
  if (stage) updateData.stage = stage;
  if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);
  if (daysOffset !== undefined) updateData.daysOffset = daysOffset === "" ? null : parseInt(daysOffset);
  if (purpose) updateData.purpose = purpose;
  if (assigneeId) updateData.assigneeId = parseInt(assigneeId);
  if (status) updateData.status = status;

  const plan = await prisma.visitPlan.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      student: { select: { id: true, name: true, phone: true } },
      assignee: { select: { id: true, realName: true, username: true } },
    },
  });

  return NextResponse.json(plan);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const _denied = await requirePermission(request, "visit_plans:delete");
    if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;

  const existing = await prisma.visitPlan.findFirst({
    where: { id: parseInt(id), student: { tenantId } },
  });
  if (!existing) return NextResponse.json({ error: "回访计划不存在" }, { status: 404 });

  await prisma.visitPlan.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
