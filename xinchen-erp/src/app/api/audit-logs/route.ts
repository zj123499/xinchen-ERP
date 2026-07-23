/**
 * 审计日志 API
 * GET /api/audit-logs  - 分页查询操作审计日志（可按操作类型/表名/关键词筛选）
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
  const action = searchParams.get("action") || "";
  const tableName = searchParams.get("tableName") || "";

  const where: any = { tenantId };
  if (action) where.action = action;
  if (tableName) where.tableName = tableName;

  const [total, list, actions, tables] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, realName: true, username: true } } },
    }),
    prisma.auditLog.findMany({ where: { tenantId }, distinct: ["action"], select: { action: true } }),
    prisma.auditLog.findMany({ where: { tenantId, tableName: { not: null } }, distinct: ["tableName"], select: { tableName: true } }),
  ]);

  return NextResponse.json({
    total, page, pageSize, totalPages: Math.ceil(total / pageSize),
    list: list.map((l) => ({
      id: l.id,
      action: l.action,
      tableName: l.tableName,
      recordId: l.recordId,
      operatorName: l.user?.realName || l.user?.username || `用户${l.userId}`,
      ipAddress: l.ipAddress,
      beforeData: l.beforeData,
      afterData: l.afterData,
      createdAt: l.createdAt,
    })),
    filters: {
      actions: actions.map((a) => a.action),
      tables: tables.map((t) => t.tableName).filter(Boolean),
    },
  });
}
