/**
 * 订单详情 API
 * GET    /api/orders/[id] - 订单详情（含学生、合同、收款、申请）
 * PUT    /api/orders/[id] - 更新订单
 * DELETE /api/orders/[id] - 删除订单
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

  const order = await prisma.order.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      student: {
        select: { id: true, name: true, phone: true, wechat: true },
      },
      contract: {
        select: { id: true, contractNo: true, totalAmount: true, status: true },
      },
      assignedTo: { select: { id: true, realName: true } },
      payments: {
        orderBy: { createdAt: "desc" },
      },
      applications: {
        include: {
          offers: { select: { id: true, institutionName: true, majorName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.order.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  // 如果修改了订单编号，检查唯一性
  if (body.orderNo && body.orderNo !== existing.orderNo) {
    const dup = await prisma.order.findUnique({
      where: { orderNo: body.orderNo },
    });
    if (dup) {
      return NextResponse.json({ error: "订单编号已存在" }, { status: 409 });
    }
  }

  const data: Record<string, unknown> = {};
  if (body.studentId !== undefined) data.studentId = parseInt(body.studentId);
  if (body.contractId !== undefined) data.contractId = parseInt(body.contractId);
  if (body.orderNo !== undefined) data.orderNo = body.orderNo;
  if (body.productName !== undefined) data.productName = body.productName;
  if (body.amount !== undefined) data.amount = parseFloat(body.amount);
  if (body.currency !== undefined) data.currency = body.currency;
  if (body.status !== undefined) data.status = body.status;
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId ? parseInt(body.assignedToId) : null;
  if (body.remark !== undefined) data.remark = body.remark;

  const order = await prisma.order.update({
    where: { id: parseInt(id) },
    data,
    include: {
      student: { select: { id: true, name: true, phone: true } },
      contract: { select: { id: true, contractNo: true } },
      assignedTo: { select: { id: true, realName: true } },
    },
  });

  return NextResponse.json(order);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.order.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  // 检查是否有关联收款和申请
  const paymentCount = await prisma.payment.count({
    where: { orderId: parseInt(id) },
  });
  const applicationCount = await prisma.application.count({
    where: { orderId: parseInt(id) },
  });

  if (paymentCount > 0 || applicationCount > 0) {
    return NextResponse.json(
      { error: "该订单下存在收款记录或申请记录，请先删除相关记录" },
      { status: 400 }
    );
  }

  await prisma.order.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ message: "删除成功" });
}
