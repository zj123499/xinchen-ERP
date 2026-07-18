/**
 * 签证详情 API
 * GET    /api/visas/[id] - 获取签证详情
 * PUT    /api/visas/[id] - 更新签证
 * DELETE /api/visas/[id] - 删除签证
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { visaType, status, submittedAt, resultAt, visaNumber, expiryDate, attachmentUrl } = body;

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
      submittedAt: submittedAt ? new Date(submittedAt) : submittedAt === null ? null : undefined,
      resultAt: resultAt ? new Date(resultAt) : resultAt === null ? null : undefined,
      visaNumber: visaNumber !== undefined ? visaNumber : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : expiryDate === null ? null : undefined,
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
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
