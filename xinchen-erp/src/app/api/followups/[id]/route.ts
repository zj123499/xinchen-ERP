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

  const followUp = await prisma.followUp.findFirst({
    where: { id: parseInt(id), student: { tenantId } },
    include: {
      user: { select: { id: true, realName: true } },
      student: { select: { id: true, name: true, phone: true } },
      lead: { select: { id: true, name: true, source: true, status: true } },
    },
  });

  if (!followUp) return NextResponse.json({ error: "跟进记录不存在" }, { status: 404 });
  return NextResponse.json(followUp);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { type, content, nextPlan, nextFollowUpAt } = body;

  const existing = await prisma.followUp.findFirst({
    where: { id: parseInt(id), student: { tenantId } },
  });
  if (!existing) return NextResponse.json({ error: "跟进记录不存在" }, { status: 404 });

  const updateData: any = {};
  if (type) updateData.type = type;
  if (content) updateData.content = content;
  if (nextPlan !== undefined) updateData.nextPlan = nextPlan;
  if (nextFollowUpAt !== undefined) updateData.nextFollowUpAt = nextFollowUpAt ? new Date(nextFollowUpAt) : null;

  const followUp = await prisma.followUp.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      user: { select: { id: true, realName: true } },
      student: { select: { id: true, name: true, phone: true } },
      lead: { select: { id: true, name: true, source: true, status: true } },
    },
  });

  return NextResponse.json(followUp);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.followUp.findFirst({
    where: { id: parseInt(id), student: { tenantId } },
  });
  if (!existing) return NextResponse.json({ error: "跟进记录不存在" }, { status: 404 });

  await prisma.followUp.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
