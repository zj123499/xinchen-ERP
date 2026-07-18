/**
 * 登录日志 API
 * GET /api/login-logs - 分页查询登录日志（可按状态/用户名筛选）
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
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "30");
  const status = searchParams.get("status") || "";
  const keyword = searchParams.get("keyword") || "";

  const where: any = { tenantId };
  if (status) where.status = status;
  if (keyword) where.username = { contains: keyword };

  const [total, list, statuses] = await Promise.all([
    prisma.loginLog.count({ where }),
    prisma.loginLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, realName: true, username: true } } },
    }),
    prisma.loginLog.findMany({ where: { tenantId }, distinct: ["status"], select: { status: true } }),
  ]);

  return NextResponse.json({
    total, page, pageSize, totalPages: Math.ceil(total / pageSize),
    list: list.map((l) => ({
      id: l.id,
      username: l.username,
      status: l.status,
      reason: l.reason,
      operatorName: l.user?.realName || l.user?.username || l.username || `用户${l.userId}`,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
    })),
    filters: {
      statuses: statuses.map((s) => s.status),
    },
  });
}
