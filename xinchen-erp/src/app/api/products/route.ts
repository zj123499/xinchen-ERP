/**
 * 产品/服务包管理 API（产品资源中心）
 * GET  /api/products - 列表（分页/搜索/按国家/业务线筛选）
 * POST /api/products - 新增产品
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
  const countryId = url.searchParams.get("countryId") || "";
  const businessLineId = url.searchParams.get("businessLineId") || "";
  const status = url.searchParams.get("status") || "";

  const where: Prisma.ProductWhereInput = { tenantId };
  if (keyword) where.name = { contains: keyword };
  if (countryId) where.countryId = parseInt(countryId);
  if (businessLineId) where.businessLineId = parseInt(businessLineId);
  if (status) where.status = status as Prisma.EnumProductStatusFilter["equals"];

  const [total, list] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        businessLine: { select: { id: true, name: true } },
        country: { select: { id: true, name: true } },
        institution: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), list });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { name, businessLineId, countryId, institutionId, description, price, commissionRate, status, remark } = body;

  if (!name || price === undefined || price === null) {
    return NextResponse.json({ error: "产品名称和价格为必填项" }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      tenantId,
      businessLineId: businessLineId ? parseInt(businessLineId) : null,
      countryId: countryId ? parseInt(countryId) : null,
      institutionId: institutionId ? parseInt(institutionId) : null,
      name,
      description: description || null,
      price: parseFloat(price),
      commissionRate: commissionRate ? parseFloat(commissionRate) : null,
      status: status || "ACTIVE",
      remark: remark || null,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
