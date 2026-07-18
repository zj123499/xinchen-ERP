/**
 * 院校管理 API（产品资源中心）
 * GET  /api/institutions - 列表（分页/搜索/按国家筛选）
 * POST /api/institutions - 新增院校
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

  const where: Prisma.InstitutionWhereInput = { tenantId };
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { tuitionRange: { contains: keyword } },
    ];
  }
  if (countryId) where.countryId = parseInt(countryId);

  const [total, list] = await Promise.all([
    prisma.institution.count({ where }),
    prisma.institution.findMany({
      where,
      include: {
        country: { select: { id: true, name: true, code: true } },
        _count: { select: { majors: true } },
      },
      orderBy: { ranking: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), list });
}

export async function POST(request: NextRequest) {
  const { tenantId, userId } = getContext(request);
  const body = await request.json();
  const { name, countryId, type, ranking, tuitionRange, requirements, remark } = body;

  if (!name || !countryId) {
    return NextResponse.json({ error: "院校名称和国家为必填项" }, { status: 400 });
  }

  const country = await prisma.country.findFirst({ where: { id: parseInt(countryId), tenantId } });
  if (!country) return NextResponse.json({ error: "国家不存在" }, { status: 400 });

  const institution = await prisma.institution.create({
    data: {
      tenantId,
      countryId: parseInt(countryId),
      name,
      type: type || "UNIVERSITY",
      ranking: ranking ? parseInt(ranking) : null,
      tuitionRange: tuitionRange || null,
      requirements: requirements || null,
      remark: remark || null,
    },
  });

  return NextResponse.json(institution, { status: 201 });
}
