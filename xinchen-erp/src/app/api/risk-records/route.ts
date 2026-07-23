/**
 * 风险记录 API（风险管理中心）
 * GET  /api/risk-records - 列表（按等级/状态筛选）
 * POST /api/risk-records - 手动新增风险记录
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
  const level = url.searchParams.get("level") || "";
  const status = url.searchParams.get("status") || "";

  const where: Prisma.RiskRecordWhereInput = { tenantId };
  if (level) where.riskLevel = level as Prisma.EnumRiskLevelFilter["equals"];
  if (status) where.status = status as Prisma.EnumRiskRecordStatusFilter["equals"];

  const [total, list] = await Promise.all([
    prisma.riskRecord.count({ where }),
    prisma.riskRecord.findMany({
      where,
      include: {
        rule: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
      },
      orderBy: [{ riskLevel: "asc" }, { detectedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), list });
}

export async function POST(request: NextRequest) {
  const { tenantId, userId } = getContext(request);
  const body = await request.json();
  const { ruleId, studentId, riskLevel, detail } = body;

  if (!ruleId) return NextResponse.json({ error: "风险规则为必填项" }, { status: 400 });

  const record = await prisma.riskRecord.create({
    data: {
      tenantId,
      ruleId: parseInt(ruleId),
      studentId: studentId ? parseInt(studentId) : null,
      riskLevel: riskLevel || "MEDIUM",
      status: "OPEN",
      detail: detail || null,
    },
    include: { rule: { select: { name: true } }, student: { select: { name: true } } },
  });

  // 生成系统通知
  await prisma.riskNotification.create({
    data: {
      tenantId,
      riskRecordId: record.id,
      studentId: studentId ? parseInt(studentId) : null,
      channel: "SYSTEM",
      content: `风险预警【${record.riskLevel}】：${record.rule.name}${record.student ? ` - 学生 ${record.student.name}` : ""}`,
    },
  }).catch(() => {});

  return NextResponse.json(record, { status: 201 });
}
