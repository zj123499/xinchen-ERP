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
  const { id } = await params;

  const site = await prisma.site.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!site) return NextResponse.json({ error: "站点不存在" }, { status: 404 });
  return NextResponse.json(site);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { name, domain, status } = body;

  const existing = await prisma.site.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "站点不存在" }, { status: 404 });

  const updateData: any = {};
  if (name) updateData.name = name;
  if (domain) updateData.domain = domain;
  if (status) updateData.status = status;

  const site = await prisma.site.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  return NextResponse.json(site);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.site.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "站点不存在" }, { status: 404 });

  await prisma.site.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
