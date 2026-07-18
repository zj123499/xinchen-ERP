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

  const cost = await prisma.cost.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      student: { select: { id: true, name: true } },
    },
  });

  if (!cost) return NextResponse.json({ error: "成本记录不存在" }, { status: 404 });
  return NextResponse.json(cost);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { studentId, costType, amount, currency, fiscalYear, fiscalMonth, description, attachmentUrl } = body;

  const existing = await prisma.cost.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "成本记录不存在" }, { status: 404 });

  const cost = await prisma.cost.update({
    where: { id: parseInt(id) },
    data: {
      studentId: studentId !== undefined ? (studentId ? parseInt(studentId) : null) : existing.studentId,
      costType: costType || existing.costType,
      amount: amount !== undefined ? parseFloat(amount) : existing.amount,
      currency: currency || existing.currency,
      fiscalYear: fiscalYear !== undefined ? parseInt(fiscalYear) : existing.fiscalYear,
      fiscalMonth: fiscalMonth !== undefined ? parseInt(fiscalMonth) : existing.fiscalMonth,
      description: description !== undefined ? description : existing.description,
      attachmentUrl: attachmentUrl !== undefined ? attachmentUrl : existing.attachmentUrl,
    },
    include: {
      student: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(cost);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.cost.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "成本记录不存在" }, { status: 404 });

  await prisma.cost.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
