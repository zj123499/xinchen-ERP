/**
 * Offer详情 API
 * GET    /api/offers/[id] - 获取Offer详情
 * PUT    /api/offers/[id] - 更新Offer
 * DELETE /api/offers/[id] - 删除Offer
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

  const offer = await prisma.offer.findFirst({
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
          order: { select: { id: true, orderNo: true, productName: true, amount: true } },
        },
      },
    },
  });

  if (!offer) {
    return NextResponse.json({ error: "Offer不存在" }, { status: 404 });
  }

  return NextResponse.json({ ...offer, applicationId: offer.application.id });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { institutionName, majorName, offerType, conditions, deadline, status, offerDate, responseDate, attachmentUrl } = body;

  const existing = await prisma.offer.findFirst({
    where: { id: parseInt(id), application: { tenantId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Offer不存在" }, { status: 404 });
  }

  const offer = await prisma.offer.update({
    where: { id: parseInt(id) },
    data: {
      institutionName: institutionName || undefined,
      majorName: majorName || undefined,
      offerType: offerType || undefined,
      conditions: conditions !== undefined ? conditions : undefined,
      deadline: deadline ? new Date(deadline) : deadline === null ? null : undefined,
      status: status || undefined,
      offerDate: offerDate ? new Date(offerDate) : undefined,
      responseDate: responseDate ? new Date(responseDate) : responseDate === null ? null : undefined,
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

  return NextResponse.json(offer);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.offer.findFirst({
    where: { id: parseInt(id), application: { tenantId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Offer不存在" }, { status: 404 });
  }

  await prisma.offer.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
