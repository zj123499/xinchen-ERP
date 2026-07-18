/**
 * 申请管理 API
 * GET  /api/applications - 申请列表
 * POST /api/applications - 新增申请
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
  const studentId = url.searchParams.get("studentId") || "";
  const orderId = url.searchParams.get("orderId") || "";

  const where: Prisma.ApplicationWhereInput = { tenantId };
  if (keyword) {
    where.OR = [
      { institutionName: { contains: keyword } },
      { majorName: { contains: keyword } },
      { student: { name: { contains: keyword } } },
    ];
  }
  if (status) where.status = status as Prisma.EnumApplicationStatusFilter["equals"];
  if (studentId) where.studentId = parseInt(studentId);
  if (orderId) where.orderId = parseInt(orderId);

  const [total, list] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, phone: true } },
        order: { select: { id: true, orderNo: true, productName: true } },
        _count: { select: { offers: true, visas: true, materials: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), list });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { studentId, orderId, institutionName, majorName, degree, intakeYear, intakeMonth, status, remark } = body;
  if (!studentId || !orderId || !institutionName || !majorName) {
    return NextResponse.json({ error: "学生、订单、院校和专业为必填项" }, { status: 400 });
  }
  const application = await prisma.application.create({
    data: {
      tenantId, studentId: parseInt(studentId), orderId: parseInt(orderId),
      institutionName, majorName, degree: degree || "硕士",
      intakeYear: intakeYear || new Date().getFullYear() + 1, intakeMonth: intakeMonth || 9,
      status: status || "PREPARING", remark: remark || null,
    },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      order: { select: { id: true, orderNo: true, productName: true } },
    },
  });
  return NextResponse.json(application, { status: 201 });
}
