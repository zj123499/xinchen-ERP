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

  const service = await prisma.overseasService.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      tenant: { select: { id: true, name: true } },
    },
  });

  if (!service) return NextResponse.json({ error: "境外服务不存在" }, { status: 404 });
  return NextResponse.json(service);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { studentId, serviceType, status, detail } = body;

  const existing = await prisma.overseasService.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "境外服务不存在" }, { status: 404 });

  const updateData: any = {};
  if (studentId) updateData.studentId = parseInt(studentId);
  if (serviceType) updateData.serviceType = serviceType;
  if (status) updateData.status = status;
  if (detail !== undefined) updateData.detail = detail;

  const service = await prisma.overseasService.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      student: { select: { id: true, name: true, phone: true } },
      tenant: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(service);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.overseasService.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "境外服务不存在" }, { status: 404 });

  await prisma.overseasService.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
