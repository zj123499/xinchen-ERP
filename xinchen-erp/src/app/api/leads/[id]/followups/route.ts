import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, tenantId } = getContext(request);
  const { id } = await params;
  const leadId = parseInt(id);

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId },
    include: { student: { select: { id: true } } },
  });
  if (!lead) return NextResponse.json({ error: "线索不存在" }, { status: 404 });

  const body = await request.json();
  const { type = "phone", content, nextPlan, nextFollowUpAt } = body;
  if (!content?.trim()) {
    return NextResponse.json({ error: "跟进内容不能为空" }, { status: 400 });
  }

  let studentId = lead.student?.id;
  if (!studentId) {
    const student = await prisma.student.create({
      data: {
        tenantId,
        name: lead.name,
        phone: lead.phone,
        wechat: lead.wechat,
        source: lead.source,
        assignedToId: lead.assignedToId,
      },
    });
    studentId = student.id;
    await prisma.lead.update({ where: { id: leadId }, data: { studentId } });
  }

  const followUp = await prisma.followUp.create({
    data: {
      studentId,
      leadId,
      userId,
      type: type || "phone",
      content,
      nextPlan: nextPlan || null,
      nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null,
    },
    include: { user: { select: { id: true, realName: true } } },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      lastFollowUpAt: new Date(),
      status: lead.status === "NEW" ? "CONTACTED" : undefined,
    },
  });

  return NextResponse.json(followUp, { status: 201 });
}
