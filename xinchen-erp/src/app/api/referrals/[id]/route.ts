/**
 * 转介绍详情 API（客户成功中心）
 * PUT    /api/referrals/:id - 转化为签约 / 发放奖励 / 作废
 * DELETE /api/referrals/:id
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
  const { status, newStudentId, rewardType, rewardAmount } = body;

  const existing = await prisma.referral.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "转介绍不存在" }, { status: 404 });

  const referral = await prisma.referral.update({
    where: { id: parseInt(id) },
    data: {
      status: status ?? existing.status,
      newStudentId: newStudentId === undefined ? existing.newStudentId : newStudentId ? parseInt(newStudentId) : null,
      rewardType: rewardType === undefined ? existing.rewardType : rewardType || null,
      rewardAmount: rewardAmount === undefined ? existing.rewardAmount : rewardAmount ? parseFloat(rewardAmount) : null,
    },
  });
  return NextResponse.json(referral);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const existing = await prisma.referral.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "转介绍不存在" }, { status: 404 });
  await prisma.referral.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
