/**
 * 投诉详情 API（客户成功中心）
 * PUT    /api/complaints/:id - 处理/闭环
 * DELETE /api/complaints/:id
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { title, content, level, status, handlerId } = body;

  const existing = await prisma.complaint.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "投诉不存在" }, { status: 404 });

  const resolved = status === "RESOLVED" || status === "CLOSED";
  const complaint = await prisma.complaint.update({
    where: { id: parseInt(id) },
    data: {
      title: title ?? existing.title,
      content: content === undefined ? existing.content : content || null,
      level: level === undefined ? existing.level : parseInt(level),
      status: status ?? existing.status,
      handlerId: handlerId === undefined ? existing.handlerId : handlerId ? parseInt(handlerId) : null,
      resolvedAt: resolved ? new Date() : existing.resolvedAt,
    },
  });
  return NextResponse.json(complaint);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const existing = await prisma.complaint.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "投诉不存在" }, { status: 404 });
  await prisma.complaint.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
