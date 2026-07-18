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

  const payment = await prisma.payment.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      order: { select: { id: true, orderNo: true, productName: true, amount: true, currency: true } },
    },
  });

  if (!payment) return NextResponse.json({ error: "收款记录不存在" }, { status: 404 });

  return NextResponse.json(payment);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.payment.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "收款记录不存在" }, { status: 404 });

  const body = await request.json();
  const {
    paymentType,
    amount,
    currency,
    exchangeRate,
    method,
    paidAt,
    payerName,
    remark,
  } = body;

  if (amount && parseFloat(amount) <= 0) {
    return NextResponse.json({ error: "请输入有效金额" }, { status: 400 });
  }

  const paidDate = paidAt ? new Date(paidAt) : existing.paidAt;
  const baseAmount = amount
    ? parseFloat(amount) * (exchangeRate ? parseFloat(exchangeRate) : (existing.exchangeRate ? Number(existing.exchangeRate) : 1))
    : existing.baseAmount;

  const payment = await prisma.payment.update({
    where: { id: parseInt(id) },
    data: {
      paymentType: paymentType || existing.paymentType,
      amount: amount ? parseFloat(amount) : existing.amount,
      currency: currency || existing.currency,
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : existing.exchangeRate,
      baseAmount,
      method: method || existing.method,
      paidAt: paidDate,
      fiscalYear: paidDate.getFullYear(),
      fiscalMonth: paidDate.getMonth() + 1,
      payerName: payerName !== undefined ? (payerName || null) : existing.payerName,
      remark: remark !== undefined ? (remark || null) : existing.remark,
    },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      order: { select: { id: true, orderNo: true, productName: true } },
    },
  });

  return NextResponse.json(payment);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.payment.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "收款记录不存在" }, { status: 404 });

  await prisma.payment.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ success: true });
}
