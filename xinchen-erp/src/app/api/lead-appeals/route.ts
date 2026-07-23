/**
 * 线索公海申诉 API
 * GET  /api/lead-appeals?status=  - 申诉列表
 * POST /api/lead-appeals          - 发起申诉（顾问申领/争议线索归属）
 *   body: { leadId, reason, evidence }
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
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");

  const where: any = { lead: { tenantId } };
  if (status) where.status = status;

  const [total, appeals] = await Promise.all([
    prisma.leadAppeal.count({ where }),
    prisma.leadAppeal.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { lead: { select: { id: true, name: true, phone: true, assignedToId: true } } },
    }),
  ]);

  const userIds = Array.from(new Set(appeals.flatMap((a) => [a.appellantId, a.reviewedBy].filter(Boolean) as number[])));
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, realName: true, username: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u.realName || u.username]));

  return NextResponse.json({
    total, page, pageSize, totalPages: Math.ceil(total / pageSize),
    list: appeals.map((a) => ({
      ...a,
      appellantName: userMap.get(a.appellantId) || `用户${a.appellantId}`,
      reviewerName: a.reviewedBy ? userMap.get(a.reviewedBy) : null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const { userId, tenantId } = getContext(request);
  const body = await request.json();
  const leadId = parseInt(body.leadId);
  const reason = body.reason;
  const evidence = body.evidence || null;

  if (!leadId || !reason) {
    return NextResponse.json({ error: "线索、申诉理由为必填项" }, { status: 400 });
  }
  const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
  if (!lead) return NextResponse.json({ error: "线索不存在" }, { status: 404 });

  const appeal = await prisma.leadAppeal.create({
    data: { leadId, appellantId: userId, reason, evidence, status: "PENDING" },
    include: { lead: { select: { id: true, name: true, phone: true } } },
  });
  return NextResponse.json(appeal, { status: 201 });
}
