/**
 * 申请详情 API
 * GET    /api/applications/[id] - 获取申请详情
 * PUT    /api/applications/[id] - 更新申请
 * DELETE /api/applications/[id] - 删除申请
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

  const application = await prisma.application.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      student: { select: { id: true, name: true, phone: true, wechat: true } },
      order: { select: { id: true, orderNo: true, productName: true, amount: true } },
      offers: {
        orderBy: { offerDate: "desc" },
        select: { id: true, institutionName: true, majorName: true, offerType: true, status: true, offerDate: true, deadline: true },
      },
      visas: {
        orderBy: { createdAt: "desc" },
        select: { id: true, visaType: true, status: true, submittedAt: true, resultAt: true, visaNumber: true, expiryDate: true },
      },
      materials: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, type: true, status: true, dueDate: true, verifiedBy: true, verifiedAt: true },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "申请不存在" }, { status: 404 });
  }

  return NextResponse.json(application);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { studentId, orderId, institutionName, majorName, degree, intakeYear, intakeMonth, status, submittedAt, resultAt, remark } = body;

  const existing = await prisma.application.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "申请不存在" }, { status: 404 });
  }

  const application = await prisma.application.update({
    where: { id: parseInt(id) },
    data: {
      studentId: studentId ? parseInt(studentId) : undefined,
      orderId: orderId ? parseInt(orderId) : undefined,
      institutionName: institutionName || undefined,
      majorName: majorName || undefined,
      degree: degree || undefined,
      intakeYear: intakeYear || undefined,
      intakeMonth: intakeMonth || undefined,
      status: status || undefined,
      submittedAt: submittedAt ? new Date(submittedAt) : submittedAt === null ? null : undefined,
      resultAt: resultAt ? new Date(resultAt) : resultAt === null ? null : undefined,
      remark: remark !== undefined ? remark : undefined,
    },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      order: { select: { id: true, orderNo: true, productName: true } },
    },
  });

  return NextResponse.json(application);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.application.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "申请不存在" }, { status: 404 });
  }

  // 检查是否有关联的 Offer
  const offerCount = await prisma.offer.count({
    where: { applicationId: parseInt(id) },
  });
  if (offerCount > 0) {
    return NextResponse.json({ error: "该申请已有关联 Offer，请先删除 Offer" }, { status: 400 });
  }

  await prisma.application.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
