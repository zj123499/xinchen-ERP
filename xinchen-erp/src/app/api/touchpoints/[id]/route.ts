import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return { tenantId: parseInt(request.headers.get("x-tenant-id") || "0") };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const id = parseInt((await params).id);
  const touchpoint = await prisma.touchpoint.findFirst({
    where: { id, tenantId },
    include: { student: { select: { id: true, name: true } } },
  });
  if (!touchpoint) return NextResponse.json({ error: "触点不存在" }, { status: 404 });
  return NextResponse.json(touchpoint);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const id = parseInt((await params).id);
  const body = await request.json().catch(() => ({}) as any);
  const existing = await prisma.touchpoint.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "触点不存在" }, { status: 404 });

  const touchpoint = await prisma.touchpoint.update({
    where: { id },
    data: {
      channel: body.channel ?? existing.channel,
      source: body.source ?? existing.source,
      medium: body.medium ?? existing.medium,
      campaign: body.campaign ?? existing.campaign,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : existing.occurredAt,
      touchUrl: body.touchUrl ?? existing.touchUrl,
      remark: body.remark ?? existing.remark,
    },
  });
  return NextResponse.json(touchpoint);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const id = parseInt((await params).id);
  const existing = await prisma.touchpoint.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "触点不存在" }, { status: 404 });
  await prisma.touchpoint.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
