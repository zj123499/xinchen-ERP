/**
 * 合同管理 API
 * GET  /api/contracts - 合同列表（支持分页、搜索、筛选）
 * POST /api/contracts - 新增合同
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/permission";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const denied = await requirePermission(request, "contracts:view");
  if (denied) return denied;
  const { tenantId } = getContext(request);
  const url = new URL(request.url);

  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
  const keyword = url.searchParams.get("keyword") || "";
  const status = url.searchParams.get("status") || "";
  const studentId = url.searchParams.get("studentId") || "";

  const where: Prisma.ContractWhereInput = { tenantId };

  if (keyword) {
    where.OR = [
      { contractNo: { contains: keyword } },
      { student: { name: { contains: keyword } } },
    ];
  }
  if (status) where.status = status as Prisma.EnumContractStatusFilter["equals"];
  if (studentId) where.studentId = parseInt(studentId);

  const [total, list] = await Promise.all([
    prisma.contract.count({ where }),
    prisma.contract.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, phone: true } },
        businessLine: { select: { id: true, name: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { updatedAt: "desc" },
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
  const denied = await requirePermission(request, "contracts:create");
  if (denied) return denied;
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { studentId, contractNo, businessLineId, signDate, totalAmount, currency, status, content, remark } = body;

  if (!studentId || !contractNo || !totalAmount) {
    return NextResponse.json({ error: "学生、合同编号和合同金额为必填项" }, { status: 400 });
  }

  // 检查合同编号唯一性
  const existing = await prisma.contract.findUnique({
    where: { contractNo },
  });

  if (existing) {
    return NextResponse.json({ error: "合同编号已存在" }, { status: 409 });
  }

  const contract = await prisma.contract.create({
    data: {
      tenantId,
      studentId: parseInt(studentId),
      contractNo,
      businessLineId: businessLineId ? parseInt(businessLineId) : null,
      signDate: signDate ? new Date(signDate) : new Date(),
      totalAmount: parseFloat(totalAmount),
      currency: currency || "CNY",
      status: status || "DRAFT",
      content: content || null,
      remark: remark || null,
    },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      businessLine: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(contract, { status: 201 });
}
