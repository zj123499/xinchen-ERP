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

  const record = await prisma.visitRecord.findFirst({
    where: { id: parseInt(id), student: { tenantId } },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      visitor: { select: { id: true, realName: true, username: true } },
      plan: { select: { id: true, stage: true, purpose: true } },
    },
  });

  if (!record) return NextResponse.json({ error: "回访记录不存在" }, { status: 404 });
  return NextResponse.json(record);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { visitType, visitDate, duration, satisfaction, mood, summary, studentFeedback,
    hasUpsellNeed, upsellType, upsellDetail, hasReferral, referralContact,
    needFollowUp, nextFollowUpAt, actionItems } = body;

  const existing = await prisma.visitRecord.findFirst({
    where: { id: parseInt(id), student: { tenantId } },
  });
  if (!existing) return NextResponse.json({ error: "回访记录不存在" }, { status: 404 });

  const updateData: any = {};
  if (visitType) updateData.visitType = visitType;
  if (visitDate) updateData.visitDate = new Date(visitDate);
  if (duration !== undefined) updateData.duration = duration ? parseInt(duration) : null;
  if (satisfaction !== undefined) updateData.satisfaction = satisfaction ? parseInt(satisfaction) : null;
  if (mood !== undefined) updateData.mood = mood;
  if (summary !== undefined) updateData.summary = summary;
  if (studentFeedback !== undefined) updateData.studentFeedback = studentFeedback;
  if (hasUpsellNeed !== undefined) updateData.hasUpsellNeed = hasUpsellNeed;
  if (upsellType !== undefined) updateData.upsellType = upsellType;
  if (upsellDetail !== undefined) updateData.upsellDetail = upsellDetail;
  if (hasReferral !== undefined) updateData.hasReferral = hasReferral;
  if (referralContact !== undefined) updateData.referralContact = referralContact;
  if (needFollowUp !== undefined) updateData.needFollowUp = needFollowUp;
  if (nextFollowUpAt !== undefined) updateData.nextFollowUpAt = nextFollowUpAt ? new Date(nextFollowUpAt) : null;
  if (actionItems !== undefined) updateData.actionItems = actionItems;

  const record = await prisma.visitRecord.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      student: { select: { id: true, name: true, phone: true } },
      visitor: { select: { id: true, realName: true, username: true } },
      plan: { select: { id: true, stage: true, purpose: true } },
    },
  });

  return NextResponse.json(record);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.visitRecord.findFirst({
    where: { id: parseInt(id), student: { tenantId } },
  });
  if (!existing) return NextResponse.json({ error: "回访记录不存在" }, { status: 404 });

  await prisma.visitRecord.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
