/**
 * 回访计划 API
 * GET  /api/visit-plans  - 分页查询回访计划（可按状态/学生/负责人筛选）
 * POST /api/visit-plans  - 新建回访计划（自动化触发核心：签约/入学后按阶段生成回访任务）
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
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const status = searchParams.get("status") || "";
  const stage = searchParams.get("stage") || "";
  const assigneeId = searchParams.get("assigneeId") || "";
  const studentId = searchParams.get("studentId") || "";

  const where: any = { student: { tenantId } };
  if (status) where.status = status;
  if (stage) where.stage = stage;
  if (assigneeId) where.assigneeId = parseInt(assigneeId);
  if (studentId) where.studentId = parseInt(studentId);

  const [total, list] = await Promise.all([
    prisma.visitPlan.count({ where }),
    prisma.visitPlan.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
      include: {
        student: { select: { id: true, name: true, phone: true } },
        assignee: { select: { id: true, realName: true, username: true } },
        records: { select: { id: true } },
      },
    }),
  ]);

  return NextResponse.json({
    total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
    list: list.map((p) => ({ ...p, recordCount: p.records.length })),
  });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { studentId, stage, triggerType, scheduledAt, daysOffset, purpose, assigneeId } = body;

  if (!studentId || !stage || !scheduledAt || !purpose || !assigneeId) {
    return NextResponse.json({ error: "学生、回访阶段、计划时间、回访目的、负责人为必填项" }, { status: 400 });
  }

  // 租户校验：学生必须属于当前租户
  const student = await prisma.student.findFirst({ where: { id: parseInt(studentId), tenantId } });
  if (!student) return NextResponse.json({ error: "学生不存在" }, { status: 404 });

  const plan = await prisma.visitPlan.create({
    data: {
      studentId: parseInt(studentId),
      stage,
      triggerType: triggerType || "SCHEDULED",
      scheduledAt: new Date(scheduledAt),
      daysOffset: daysOffset !== undefined && daysOffset !== "" ? parseInt(daysOffset) : null,
      purpose,
      assigneeId: parseInt(assigneeId),
      status: "PENDING",
    },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      assignee: { select: { id: true, realName: true, username: true } },
    },
  });

  return NextResponse.json({ ...plan, recordCount: 0 }, { status: 201 });
}
