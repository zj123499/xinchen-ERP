import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const _denied = await requirePermission(request, "overseas:view");
    if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
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
    const _denied = await requirePermission(request, "overseas:manage");
    if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const body = await request.json();
  const { studentId, serviceType, status, detail, startDate, endDate } = body;

  const existing = await prisma.overseasService.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "境外服务不存在" }, { status: 404 });

  const updateData: any = {};
  if (studentId) updateData.studentId = parseInt(studentId);
  if (serviceType) updateData.serviceType = serviceType;
  if (status) updateData.status = status;
  if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
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
  const { tenantId } = getServerContext(request);
  const { id } = await params;

  const existing = await prisma.overseasService.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "境外服务不存在" }, { status: 404 });

  await prisma.overseasService.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
