/**
 * 投诉管理 API（客户成功中心）
 * GET  /api/complaints - 列表（按状态/等级筛选）
 * POST /api/complaints - 新增投诉
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
  const status = url.searchParams.get("status") || "";
  const level = url.searchParams.get("level") || "";

  const where: Prisma.ComplaintWhereInput = { tenantId };
  if (status) where.status = status as Prisma.EnumComplaintStatusFilter["equals"];
  if (level) where.level = parseInt(level);

  const [total, list] = await Promise.all([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({
      where,
      include: {
        student: { select: { id: true, name: true } },
      },
      orderBy: [{ level: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), list });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { studentId, title, content, level, handlerId } = body;

  if (!studentId || !title) return NextResponse.json({ error: "学生和投诉标题为必填项" }, { status: 400 });

  const complaint = await prisma.complaint.create({
    data: {
      tenantId,
      studentId: parseInt(studentId),
      title,
      content: content || null,
      level: level ? parseInt(level) : 2,
      handlerId: handlerId ? parseInt(handlerId) : null,
      status: "OPEN",
    },
  });
  return NextResponse.json(complaint, { status: 201 });
}
