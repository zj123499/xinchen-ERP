/**
 * 订单管理 API
 * GET  /api/orders - 订单列表（支持分页、搜索、筛选）
 * POST /api/orders - 新增订单
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
  const contractId = url.searchParams.get("contractId") || "";
  const studentId = url.searchParams.get("studentId") || "";

  const where: Prisma.OrderWhereInput = { tenantId };

  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword } },
      { productName: { contains: keyword } },
      { student: { name: { contains: keyword } } },
    ];
  }
  if (status) where.status = status as Prisma.EnumOrderStatusFilter["equals"];
  if (contractId) where.contractId = parseInt(contractId);
  if (studentId) where.studentId = parseInt(studentId);

  const [total, list] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, phone: true } },
        contract: { select: { id: true, contractNo: true } },
        assignedTo: { select: { id: true, realName: true } },
        _count: { select: { payments: true, applications: true } },
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
  const { tenantId, userId } = getContext(request);
  const body = await request.json();
  const { studentId, contractId, orderNo, productName, amount, currency, status, startDate, endDate, assignedToId, remark } = body;

  if (!studentId || !contractId || !orderNo || !productName || !amount) {
    return NextResponse.json({ error: "学生、合同、订单编号、产品名称和金额为必填项" }, { status: 400 });
  }

  // 检查订单编号唯一性
  const existing = await prisma.order.findUnique({
    where: { orderNo },
  });

  if (existing) {
    return NextResponse.json({ error: "订单编号已存在" }, { status: 409 });
  }

  // 验证合同是否存在且属于同一学生
  const contract = await prisma.contract.findFirst({
    where: {
      id: parseInt(contractId),
      tenantId,
      studentId: parseInt(studentId),
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "合同不存在或与学生不匹配" }, { status: 400 });
  }

  const order = await prisma.order.create({
    data: {
      tenantId,
      studentId: parseInt(studentId),
      contractId: parseInt(contractId),
      orderNo,
      productName,
      amount: parseFloat(amount),
      currency: currency || "CNY",
      status: status || "PENDING",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      assignedToId: assignedToId ? parseInt(assignedToId) : userId,
      remark: remark || null,
    },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      contract: { select: { id: true, contractNo: true } },
      assignedTo: { select: { id: true, realName: true } },
    },
  });

  return NextResponse.json(order, { status: 201 });
}
