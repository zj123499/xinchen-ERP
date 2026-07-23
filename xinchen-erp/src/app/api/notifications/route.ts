/**
 * 通知 API
 * GET  /api/notifications - 获取通知列表
 * POST /api/notifications - 创建通知
 * PUT  /api/notifications/read-all - 全部标记已读
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { userId } = getContext(request);
  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  const limit = parseInt(url.searchParams.get("limit") || "20");

  const where: any = { userId };
  if (unreadOnly) where.isRead = false;

  const [total, unreadCount, list] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  return NextResponse.json({ list, total, unreadCount });
}

export async function POST(request: NextRequest) {
  const { userId } = getContext(request);
  const body = await request.json();
  const { title, content, type, link, targetUserId } = body;

  if (!title) {
    return NextResponse.json({ error: "通知标题为必填项" }, { status: 400 });
  }

  const notification = await prisma.notification.create({
    data: {
      userId: targetUserId || userId,
      title,
      content: content || null,
      type: type || "info",
      link: link || null,
    },
  });

  return NextResponse.json(notification, { status: 201 });
}
