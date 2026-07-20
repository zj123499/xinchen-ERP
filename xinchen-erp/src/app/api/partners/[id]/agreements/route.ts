/**
 * 合作方协议管理
 * GET  /api/partners/[id]/agreements - 列出合作协议
 * POST /api/partners/[id]/agreements - 新增合作协议
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  if (!tenantId) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  const partnerId = parseInt(id);

  const agreements = await prisma.partnerAgreement.findMany({
    where: { tenantId, partnerId },
    orderBy: { createdAt: "desc" },
    include: {
      partner: { select: { name: true } },
    },
  });

  return NextResponse.json(agreements);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId, userId } = getContext(request);
  if (!tenantId) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  const partnerId = parseInt(id);

  const body = await request.json();
  const { title, signDate, startDate, endDate, status = "active" } = body;

  if (!title) {
    return NextResponse.json({ error: "协议标题不能为空" }, { status: 400 });
  }

  const agreement = await prisma.partnerAgreement.create({
    data: {
      tenantId,
      partnerId,
      title,
      signDate: signDate ? new Date(signDate) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status,
      createdBy: userId,
    },
    include: {
      partner: { select: { name: true } },
    },
  });

  return NextResponse.json(agreement, { status: 201 });
}
