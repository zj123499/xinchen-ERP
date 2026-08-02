/**
 * 签证详情 API
 * GET    /api/visas/[id] - 获取签证详情
 * PUT    /api/visas/[id] - 更新签证
 * DELETE /api/visas/[id] - 删除签证
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function GET(
  request: NextRequest,
  {
 const _denied = await requirePermission(request, "visas:view");
 if (_denied) return _denied;
 params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getServerContext(request);
  const { id } = await params;

  const visa = await prisma.visa.findFirst({
    where: { id: parseInt(id), application: { tenantId } },
    include: {
      application: {
        select: {
          id: true,
          institutionName: true,
          majorName: true,
          degree: true,
          intakeYear: true,
          intakeMonth: true,
          status: true,
          student: { select: { id: true, name: true, phone: true, wechat: true } },
          order: { select: { id: true, orderNo: true, productName: true } },
        },
      },
    },
  });

  if (!visa) {
    return NextResponse.json({ error: "签证不存在" }, { status: 404 });
  }

  return NextResponse.json({ ...visa, applicationId: visa.application.id });
}

export async function PUT(
  request: NextRequest,
  {
 const _denied = await requirePermission(request, "visas:update");
 if (_denied) return _denied;
 params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const body = await request.json();
  const { visaType, status, approvedDate, resultAt, attachmentUrl } = body;

  const existing = await prisma.visa.findFirst({
    where: { id: parseInt(id), application: { tenantId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "签证不存在" }, { status: 404 });
  }

  const visa = await prisma.visa.update({
    where: { id: parseInt(id) },
    data: {
      visaType: visaType || undefined,
      status: status || undefined,
      approvedDate: approvedDate ? new Date(approvedDate) : approvedDate === null ? null : undefined,
      resultAt: resultAt ? new Date(resultAt) : resultAt === null ? null : undefined,
      attachmentUrl: attachmentUrl !== undefined ? attachmentUrl : undefined,
    },
    include: {
      application: {
        select: {
          id: true,
          institutionName: true,
          majorName: true,
          student: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(visa);
}

export async function DELETE(
  request: NextRequest,
  {
 const _denied = await requirePermission(request, "visas:update");
 if (_denied) return _denied;
 params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getServerContext(request);
  const { id } = await params;

  const existing = await prisma.visa.findFirst({
    where: { id: parseInt(id), application: { tenantId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "签证不存在" }, { status: 404 });
  }

  await prisma.visa.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
