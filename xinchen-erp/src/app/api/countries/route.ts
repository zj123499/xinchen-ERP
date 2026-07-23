/**
 * 国家管理 API（产品资源中心）
 * GET  /api/countries - 国家列表（分页/搜索）
 * POST /api/countries - 新增国家
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

  const where: Prisma.CountryWhereInput = { tenantId };
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { code: { contains: keyword } },
      { region: { contains: keyword } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.country.count({ where }),
    prisma.country.findMany({
      where,
      include: { _count: { select: { institutions: true, products: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), list });
}

export async function POST(request: NextRequest) {
  const { tenantId, userId } = getContext(request);
  const body = await request.json();
  const { name, code, region, visaPolicy, remark } = body;

  if (!name || !code) {
    return NextResponse.json({ error: "国家和代码为必填项" }, { status: 400 });
  }

  const existing = await prisma.country.findFirst({ where: { tenantId, code } });
  if (existing) {
    return NextResponse.json({ error: "该国家代码已存在" }, { status: 409 });
  }

  const country = await prisma.country.create({
    data: {
      tenantId,
      name,
      code,
      region: region || null,
      visaPolicy: visaPolicy || null,
      remark: remark || null,
    },
  });

  return NextResponse.json(country, { status: 201 });
}
