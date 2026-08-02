/**
 * 通知批量操作 API
 * PUT /api/notifications/read-all - 全部标记已读
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";


export async function PUT(request: NextRequest) {
  const { userId } = getServerContext(request);

  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, updated: result.count });
}
