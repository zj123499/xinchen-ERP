/**
 * 满意度调查 API（客户成功中心）
 * GET  /api/satisfaction-surveys - 列表
 * POST /api/satisfaction-surveys - 新增调查
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

  const where: Prisma.SatisfactionSurveyWhereInput = { tenantId };
  if (status) where.status = status as Prisma.EnumSurveyStatusFilter["equals"];

  const [total, list] = await Promise.all([
    prisma.satisfactionSurvey.count({ where }),
    prisma.satisfactionSurvey.findMany({
      where,
      include: { student: { select: { id: true, name: true } } },
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), list });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { studentId, nps, score, dimensionScores, feedback } = body;

  if (!studentId) return NextResponse.json({ error: "学生为必填项" }, { status: 400 });

  const survey = await prisma.satisfactionSurvey.create({
    data: {
      tenantId,
      studentId: parseInt(studentId),
      nps: nps !== undefined ? parseInt(nps) : null,
      score: score !== undefined ? parseInt(score) : null,
      dimensionScores: dimensionScores || null,
      feedback: feedback || null,
      status: "SENT",
    },
  });
  return NextResponse.json(survey, { status: 201 });
}
