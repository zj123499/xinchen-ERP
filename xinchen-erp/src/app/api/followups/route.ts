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
  const keyword = searchParams.get("keyword") || "";
  const type = searchParams.get("type") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

  const where: Record<string, unknown> = {
    student: { tenantId },
  };

  if (type) {
    where.type = type;
  }

  if (keyword) {
    where.OR = [
      { content: { contains: keyword } },
      { nextPlan: { contains: keyword } },
      { student: { name: { contains: keyword } } },
      { student: { phone: { contains: keyword } } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.followUp.count({ where }),
    prisma.followUp.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, realName: true } },
        student: { select: { id: true, name: true, phone: true } },
        lead: { select: { id: true, name: true, source: true, status: true } },
      },
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    list,
  });
}

export async function POST(request: NextRequest) {
  const { userId } = getContext(request);
  const body = await request.json();
  const { studentId, type, content, nextPlan, nextFollowUpAt, leadId } = body;

  if (!studentId || !content) {
    return NextResponse.json({ error: "学生和跟进内容为必填项" }, { status: 400 });
  }

  const followUp = await prisma.followUp.create({
    data: {
      studentId: parseInt(studentId),
      userId,
      type: type || "phone",
      content,
      nextPlan: nextPlan || null,
      nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
      leadId: leadId ? parseInt(leadId) : null,
    },
    include: {
      user: { select: { id: true, realName: true } },
      student: { select: { id: true, name: true, phone: true } },
      lead: { select: { id: true, name: true, source: true, status: true } },
    },
  });

  return NextResponse.json(followUp, { status: 201 });
}
