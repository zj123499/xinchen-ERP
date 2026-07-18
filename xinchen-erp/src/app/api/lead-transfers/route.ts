/**
 * 线索流转 API
 * GET  /api/lead-transfers?leadId=  - 查询流转日志（可指定线索）
 * POST /api/lead-transfers          - 执行线索转移，写入流转日志并更新归属人
 *   body: { leadId, toUserId, reason }
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
  const leadId = searchParams.get("leadId");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");

  const where: any = { lead: { tenantId } };
  if (leadId) where.leadId = parseInt(leadId);

  const [total, logs] = await Promise.all([
    prisma.leadTransferLog.count({ where }),
    prisma.leadTransferLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { lead: { select: { id: true, name: true, phone: true } } },
    }),
  ]);

  // 补充转出/转入人姓名
  const userIds = Array.from(new Set(logs.flatMap((l) => [l.fromUserId, l.toUserId])));
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, realName: true, username: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u.realName || u.username]));

  return NextResponse.json({
    total, page, pageSize, totalPages: Math.ceil(total / pageSize),
    list: logs.map((l) => ({
      ...l,
      fromUserName: userMap.get(l.fromUserId) || `用户${l.fromUserId}`,
      toUserName: userMap.get(l.toUserId) || `用户${l.toUserId}`,
    })),
  });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const leadId = parseInt(body.leadId);
  const toUserId = parseInt(body.toUserId);
  const reason = body.reason || null;

  if (!leadId || !toUserId) {
    return NextResponse.json({ error: "线索、接收人为必填项" }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
  if (!lead) return NextResponse.json({ error: "线索不存在" }, { status: 404 });
  if (lead.assignedToId === toUserId) {
    return NextResponse.json({ error: "接收人与当前归属人相同" }, { status: 400 });
  }

  // 事务：写日志 + 更新归属
  const [log] = await prisma.$transaction([
    prisma.leadTransferLog.create({
      data: { leadId, fromUserId: lead.assignedToId, toUserId, reason },
      include: { lead: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.lead.update({ where: { id: leadId }, data: { assignedToId: toUserId } }),
  ]);

  return NextResponse.json(log, { status: 201 });
}
