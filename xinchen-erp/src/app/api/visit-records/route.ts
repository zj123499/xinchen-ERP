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
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const visitType = searchParams.get("visitType") || "";
  const studentId = searchParams.get("studentId") || "";
  const keyword = searchParams.get("keyword") || "";

  const where: any = { student: { tenantId } };
  if (visitType) where.visitType = visitType;
  if (studentId) where.studentId = parseInt(studentId);
  if (keyword) {
    where.OR = [
      { summary: { contains: keyword } },
      { studentFeedback: { contains: keyword } },
      { student: { name: { contains: keyword } } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.visitRecord.count({ where }),
    prisma.visitRecord.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { visitDate: "desc" },
      include: {
        student: { select: { id: true, name: true, phone: true } },
        visitor: { select: { id: true, realName: true, username: true } },
        plan: { select: { id: true, stage: true, purpose: true } },
      },
    }),
  ]);

  return NextResponse.json({
    total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
    list,
  });
}

export async function POST(request: NextRequest) {
  const { userId, tenantId } = getContext(request);
  const body = await request.json();
  const { studentId, visitType, visitDate, duration, satisfaction, mood, summary, studentFeedback,
    hasUpsellNeed, upsellType, upsellDetail, hasReferral, referralContact,
    needFollowUp, nextFollowUpAt, actionItems, planId } = body;

  if (!studentId || !visitType || !visitDate) {
    return NextResponse.json({ error: "学生、回访方式和回访日期为必填项" }, { status: 400 });
  }

  const record = await prisma.visitRecord.create({
    data: {
      studentId: parseInt(studentId),
      visitorId: userId,
      visitType,
      visitDate: new Date(visitDate),
      duration: duration ? parseInt(duration) : null,
      satisfaction: satisfaction ? parseInt(satisfaction) : null,
      mood: mood || null,
      summary: summary || null,
      studentFeedback: studentFeedback || null,
      hasUpsellNeed: hasUpsellNeed || false,
      upsellType: upsellType || null,
      upsellDetail: upsellDetail || null,
      hasReferral: hasReferral || false,
      referralContact: referralContact || null,
      needFollowUp: needFollowUp || false,
      nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
      actionItems: actionItems || null,
      planId: planId ? parseInt(planId) : null,
    },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      visitor: { select: { id: true, realName: true, username: true } },
      plan: { select: { id: true, stage: true, purpose: true } },
    },
  });

  return NextResponse.json(record, { status: 201 });
}
