export const dynamic = "force-dynamic";
/**
 * 通知 API
 * GET  /api/notifications - 获取通知列表
 * POST /api/notifications - 创建通知
 * PUT  /api/notifications/read-all - 全部标记已读
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function GET(request: NextRequest) {
  const { userId } = getServerContext(request);
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
  const _denied = await requirePermission(request, "settings:manage");
  if (_denied) return _denied;

  const { userId, tenantId } = getServerContext(request);
  const body = await request.json();
  const { title, content, type, link, targetUserId } = body;

  if (!title) {
    return NextResponse.json({ error: "通知标题为必填项" }, { status: 400 });
  }

  // 校验 targetUserId 属于同一租户，防止跨租户发送通知
  if (targetUserId) {
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, tenantId },
      select: { id: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "目标用户不存在" }, { status: 400 });
    }
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
