/**
 * 专业管理 API（产品资源中心）
 * GET  /api/majors - 列表（分页/搜索/按院校筛选）
 * POST /api/majors - 新增专业
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
  const institutionId = url.searchParams.get("institutionId") || "";

  const where: Prisma.MajorWhereInput = { tenantId };
  if (keyword) {
    where.OR = [{ name: { contains: keyword } }, { category: { contains: keyword } }];
  }
  if (institutionId) where.institutionId = parseInt(institutionId);

  const [total, list] = await Promise.all([
    prisma.major.count({ where }),
    prisma.major.findMany({
      where,
      include: {
        institution: { select: { id: true, name: true, country: { select: { name: true } } } },
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
  const { name, institutionId, category, degreeLevel, duration, language, tuition, entryRequirements, remark } = body;

  if (!name || !institutionId) {
    return NextResponse.json({ error: "专业名称和院校为必填项" }, { status: 400 });
  }

  const institution = await prisma.institution.findFirst({ where: { id: parseInt(institutionId), tenantId } });
  if (!institution) return NextResponse.json({ error: "院校不存在" }, { status: 400 });

  const major = await prisma.major.create({
    data: {
      tenantId,
      institutionId: parseInt(institutionId),
      name,
      category: category || null,
      degreeLevel: degreeLevel || "MASTER",
      duration: duration || null,
      language: language || null,
      tuition: tuition ? parseFloat(tuition) : null,
      entryRequirements: entryRequirements || null,
      remark: remark || null,
    },
  });

  return NextResponse.json(major, { status: 201 });
}
