/**
 * 操作日志 API
 * GET /api/operation-logs - 分页查询操作日志（可按模块/动作/关键词筛选）
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
  const module = searchParams.get("module") || "";
  const action = searchParams.get("action") || "";
  const keyword = searchParams.get("keyword") || "";

  const where: any = { tenantId };
  if (module) where.module = module;
  if (action) where.action = action;
  if (keyword) where.target = { contains: keyword };

  const [total, list, modules, actions] = await Promise.all([
    prisma.operationLog.count({ where }),
    prisma.operationLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, realName: true, username: true } } },
    }),
    prisma.operationLog.findMany({ where: { tenantId }, distinct: ["module"], select: { module: true } }),
    prisma.operationLog.findMany({ where: { tenantId }, distinct: ["action"], select: { action: true } }),
  ]);

  return NextResponse.json({
    total, page, pageSize, totalPages: Math.ceil(total / pageSize),
    list: list.map((l) => ({
      id: l.id,
      module: l.module,
      action: l.action,
      target: l.target,
      detail: l.detail,
      operatorName: l.user?.realName || l.user?.username || `用户${l.userId}`,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
    })),
    filters: {
      modules: modules.map((m) => m.module),
      actions: actions.map((a) => a.action),
    },
  });
}
