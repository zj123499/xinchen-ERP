/**
 * 通知单条操作 API
 * PUT   /api/notifications/[id] - 标记已读
 * DELETE /api/notifications/[id] - 删除通知
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = getContext(request);
  const body = await request.json().catch(() => ({}));

  const notification = await prisma.notification.updateMany({
    where: { id: parseInt(id), userId },
    data: {
      isRead: body.isRead !== false,
      readAt: body.isRead !== false ? new Date() : null,
    },
  });

  if (notification.count === 0) {
    return NextResponse.json({ error: "通知不存在或无权限" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = getContext(request);

  const result = await prisma.notification.deleteMany({
    where: { id: parseInt(id), userId },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "通知不存在或无权限" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
