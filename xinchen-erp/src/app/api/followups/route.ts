import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function GET(request: NextRequest) {
    const _denied = await requirePermission(request, "followups:view");
  if (_denied) return _denied;

const { tenantId } = getServerContext(request);
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") || "";
  const type = searchParams.get("type") || "";
  const leadId = parseInt(searchParams.get("leadId") || "0");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

  const where: Record<string, unknown> = {
    student: { tenantId },
  };

  if (type) where.type = type;
  if (leadId) where.leadId = leadId;

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
    const _denied = await requirePermission(request, "followups:create");
  if (_denied) return _denied;

const { userId } = getServerContext(request);
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

  // 同步更新线索的最后跟进时间
  if (leadId) {
    await prisma.lead.update({
      where: { id: parseInt(leadId) },
      data: { lastFollowUpAt: new Date() },
    }).catch(() => {});
  }

  return NextResponse.json(followUp, { status: 201 });
}
