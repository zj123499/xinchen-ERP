import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { taskType, assignedToId, content, reviewNote, dueDate, status } = body;

  const existing = await prisma.copywriterTask.findFirst({
    where: { id: parseInt(id), application: { tenantId } },
  });
  if (!existing) return NextResponse.json({ error: "文书任务不存在" }, { status: 404 });

  const updateData: any = {};
  if (taskType) updateData.taskType = taskType;
  if (assignedToId) updateData.assignedToId = parseInt(assignedToId);
  if (content !== undefined) updateData.content = content;
  if (reviewNote !== undefined) updateData.reviewNote = reviewNote;
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
  if (status) {
    updateData.status = status;
    if (status === "completed") updateData.completedAt = new Date();
  }

  const task = await prisma.copywriterTask.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      application: {
        select: {
          id: true, institutionName: true, majorName: true,
          student: { select: { id: true, name: true } },
        },
      },
    },
  });
  return NextResponse.json(task);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.copywriterTask.findFirst({
    where: { id: parseInt(id), application: { tenantId } },
  });
  if (!existing) return NextResponse.json({ error: "文书任务不存在" }, { status: 404 });

  await prisma.copywriterTask.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
