/**
 * 审批流详情 API
 * GET    /api/approval-flows/:id
 * PUT    /api/approval-flows/:id  (更新启停/名称/描述)
 * DELETE /api/approval-flows/:id
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const flow = await prisma.approvalFlow.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { nodes: { orderBy: { orderNo: "asc" } } },
  });
  if (!flow) return NextResponse.json({ error: "审批流不存在" }, { status: 404 });
  return NextResponse.json(flow);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { name, description, signMode, enabled } = body;

  const existing = await prisma.approvalFlow.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "审批流不存在" }, { status: 404 });

  const flow = await prisma.approvalFlow.update({
    where: { id: parseInt(id) },
    data: {
      name: name ?? existing.name,
      description: description === undefined ? existing.description : description || null,
      signMode: signMode ?? existing.signMode,
      enabled: enabled === undefined ? existing.enabled : enabled,
    },
  });
  return NextResponse.json(flow);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const existing = await prisma.approvalFlow.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "审批流不存在" }, { status: 404 });
  await prisma.approvalFlow.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
