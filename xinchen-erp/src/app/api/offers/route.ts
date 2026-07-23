/**
 * Offer管理 API
 * GET  /api/offers - Offer列表（支持分页、搜索、筛选）
 * POST /api/offers - 新增Offer
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const url = new URL(request.url);

  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
  const keyword = url.searchParams.get("keyword") || "";
  const status = url.searchParams.get("status") || "";
  const applicationId = url.searchParams.get("applicationId") || "";

  const where: Prisma.OfferWhereInput = {
    application: { tenantId },
  };

  if (keyword) {
    where.OR = [
      { institutionName: { contains: keyword } },
      { majorName: { contains: keyword } },
    ];
  }
  if (status) where.status = status as Prisma.EnumOfferStatusFilter["equals"];
  if (applicationId) where.applicationId = parseInt(applicationId);

  const [total, list] = await Promise.all([
    prisma.offer.count({ where }),
    prisma.offer.findMany({
      where,
      include: {
        application: {
          select: {
            id: true,
            institutionName: true,
            majorName: true,
            degree: true,
            student: { select: { id: true, name: true, phone: true } },
            order: { select: { id: true, orderNo: true } },
          },
        },
      },
      orderBy: { offerDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    list,
  });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { applicationId, institutionName, majorName, offerType, conditions, deadline, status, offerDate, attachmentUrl } = body;

  if (!applicationId || !institutionName || !majorName) {
    return NextResponse.json({ error: "申请、院校和专业为必填项" }, { status: 400 });
  }

  // 验证申请是否存在且属于当前租户
  const application = await prisma.application.findFirst({
    where: { id: parseInt(applicationId), tenantId },
  });
  if (!application) {
    return NextResponse.json({ error: "申请不存在" }, { status: 404 });
  }

  const offer = await prisma.offer.create({
    data: {
      applicationId: parseInt(applicationId),
      institutionName,
      majorName,
      offerType: offerType || "CONDITIONAL",
      conditions: conditions || null,
      deadline: deadline ? new Date(deadline) : null,
      status: status || "RECEIVED",
      offerDate: offerDate ? new Date(offerDate) : new Date(),
      attachmentUrl: attachmentUrl || null,
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

  // 自动更新申请状态为 OFFER
  await prisma.application.update({
    where: { id: parseInt(applicationId) },
    data: { status: "OFFER" },
  });

  return NextResponse.json(offer, { status: 201 });
}
