/**
 * 合同详情 API
 * GET    /api/contracts/[id] - 合同详情（含学生、订单、业务线）
 * PUT    /api/contracts/[id] - 更新合同
 * DELETE /api/contracts/[id] - 删除合同
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

  const contract = await prisma.contract.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      student: {
        select: { id: true, name: true, phone: true, wechat: true, currentStatus: true },
      },
      businessLine: { select: { id: true, name: true } },
      orders: {
        select: {
          id: true,
          orderNo: true,
          productName: true,
          amount: true,
          currency: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          assignedTo: { select: { id: true, realName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "合同不存在" }, { status: 404 });
  }

  return NextResponse.json(contract);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.contract.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: "合同不存在" }, { status: 404 });
  }

  // 如果修改了合同编号，检查唯一性
  if (body.contractNo && body.contractNo !== existing.contractNo) {
    const dup = await prisma.contract.findUnique({
      where: { contractNo: body.contractNo },
    });
    if (dup) {
      return NextResponse.json({ error: "合同编号已存在" }, { status: 409 });
    }
  }

  const data: Record<string, unknown> = {};
  if (body.studentId !== undefined) data.studentId = parseInt(body.studentId);
  if (body.contractNo !== undefined) data.contractNo = body.contractNo;
  if (body.businessLineId !== undefined) data.businessLineId = body.businessLineId ? parseInt(body.businessLineId) : null;
  if (body.signDate !== undefined) data.signDate = new Date(body.signDate);
  if (body.totalAmount !== undefined) data.totalAmount = parseFloat(body.totalAmount);
  if (body.currency !== undefined) data.currency = body.currency;
  if (body.status !== undefined) data.status = body.status;
  if (body.content !== undefined) data.content = body.content;
  if (body.remark !== undefined) data.remark = body.remark;

  const contract = await prisma.contract.update({
    where: { id: parseInt(id) },
    data,
    include: {
      student: { select: { id: true, name: true, phone: true } },
      businessLine: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(contract);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.contract.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: "合同不存在" }, { status: 404 });
  }

  // 检查是否有关联订单
  const orderCount = await prisma.order.count({
    where: { contractId: parseInt(id) },
  });

  if (orderCount > 0) {
    return NextResponse.json(
      { error: "该合同下存在订单，请先删除相关订单" },
      { status: 400 }
    );
  }

  await prisma.contract.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ message: "删除成功" });
}
