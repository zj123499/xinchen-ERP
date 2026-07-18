/**
 * 通知批量操作 API
 * PUT /api/notifications/read-all - 全部标记已读
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
  };
}

export async function PUT(request: NextRequest) {
  const { userId } = getContext(request);

  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, updated: result.count });
}
