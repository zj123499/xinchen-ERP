/**
 * 满意度调查详情 API（客户成功中心）
 * PUT    /api/satisfaction-surveys/:id - 回收填写（RESPONDED）
 * DELETE /api/satisfaction-surveys/:id
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { nps, score, dimensionScores, feedback, status } = body;

  const existing = await prisma.satisfactionSurvey.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "调查不存在" }, { status: 404 });

  const survey = await prisma.satisfactionSurvey.update({
    where: { id: parseInt(id) },
    data: {
      nps: nps === undefined ? existing.nps : nps !== null ? parseInt(nps) : null,
      score: score === undefined ? existing.score : score !== null ? parseInt(score) : null,
      dimensionScores: dimensionScores === undefined ? existing.dimensionScores : dimensionScores,
      feedback: feedback === undefined ? existing.feedback : feedback || null,
      status: status || "RESPONDED",
      respondedAt: new Date(),
    },
  });
  return NextResponse.json(survey);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const existing = await prisma.satisfactionSurvey.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "调查不存在" }, { status: 404 });
  await prisma.satisfactionSurvey.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
