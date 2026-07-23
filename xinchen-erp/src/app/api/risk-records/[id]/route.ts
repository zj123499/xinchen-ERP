/**
 * 风险记录处置 API（风险管理中心）
 * PUT    /api/risk-records/:id - 处置（解决/忽略）
 * DELETE /api/risk-records/:id
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
  const { userId, tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { status, detail } = body;

  const existing = await prisma.riskRecord.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "风险记录不存在" }, { status: 404 });

  const closed = status === "RESOLVED" || status === "IGNORED";
  const record = await prisma.riskRecord.update({
    where: { id: parseInt(id) },
    data: {
      status: status ?? existing.status,
      detail: detail === undefined ? existing.detail : detail || null,
      resolvedAt: closed ? new Date() : existing.resolvedAt,
      resolvedBy: closed ? userId : existing.resolvedBy,
    },
  });
  return NextResponse.json(record);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const existing = await prisma.riskRecord.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "风险记录不存在" }, { status: 404 });
  await prisma.riskRecord.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
