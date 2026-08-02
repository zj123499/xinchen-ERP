/**
 * 服务回访 API（客户成功中心）
 * GET  /api/service-visits - 列表（按回访人/结果筛选）
 * POST /api/service-visits - 新增回访
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";
import { Prisma } from "@prisma/client";


export async function GET(request: NextRequest) {

const _denied = await requirePermission(request, "visits:view");

if (_denied) return _denied;


  const { tenantId } = getServerContext(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
  const result = url.searchParams.get("result") || "";
  const studentId = url.searchParams.get("studentId") || "";

  const where: Prisma.ServiceVisitWhereInput = { tenantId };
  if (result) where.result = result as Prisma.EnumVisitResultFilter["equals"];
  if (studentId) where.studentId = parseInt(studentId);

  const [total, list] = await Promise.all([
    prisma.serviceVisit.count({ where }),
    prisma.serviceVisit.findMany({
      where,
      include: {
        student: { select: { id: true, name: true } },
      },
      orderBy: { visitDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), list });
}

export async function POST(request: NextRequest) {

const _denied = await requirePermission(request, "visits:create");

if (_denied) return _denied;


  const { tenantId, userId } = getServerContext(request);
  const body = await request.json();
  const { studentId, visitDate, channel, result, summary, nextPlan } = body;

  if (!studentId) return NextResponse.json({ error: "学生为必填项" }, { status: 400 });

  const visit = await prisma.serviceVisit.create({
    data: {
      tenantId,
      studentId: parseInt(studentId),
      visitorId: userId,
      visitDate: visitDate ? new Date(visitDate) : new Date(),
      channel: channel || null,
      result: result || "NORMAL",
      summary: summary || null,
      nextPlan: nextPlan || null,
    },
  });
  return NextResponse.json(visit, { status: 201 });
}
