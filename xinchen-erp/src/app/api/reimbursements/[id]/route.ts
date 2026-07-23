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

  const reimbursement = await prisma.reimbursement.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      applicant: { select: { id: true, realName: true, username: true } },
    },
  });

  if (!reimbursement) return NextResponse.json({ error: "报销记录不存在" }, { status: 404 });
  return NextResponse.json(reimbursement);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId, userId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { amount, category, description, status, reviewNote } = body;

  const existing = await prisma.reimbursement.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "报销记录不存在" }, { status: 404 });

  const updateData: any = {};
  if (amount !== undefined) updateData.amount = parseFloat(amount);
  if (category) updateData.category = category;
  if (description !== undefined) updateData.description = description;
  if (status) {
    updateData.status = status;
    if (status === "APPROVED" || status === "REJECTED") {
      updateData.reviewedBy = userId;
    }
    if (status === "PAID") {
      updateData.paidAt = new Date();
    }
  }
  if (reviewNote !== undefined) updateData.reviewNote = reviewNote;

  const reimbursement = await prisma.reimbursement.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      applicant: { select: { id: true, realName: true, username: true } },
    },
  });

  return NextResponse.json(reimbursement);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.reimbursement.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "报销记录不存在" }, { status: 404 });

  await prisma.reimbursement.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
