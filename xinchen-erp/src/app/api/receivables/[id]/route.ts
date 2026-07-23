import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const rec = await prisma.receivable.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { student: { select: { id: true, name: true, phone: true } } },
  });
  if (!rec) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json(rec);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { amount, currency, exchangeRate, paidAmount, dueDate, status, remark } = body;

  const existing = await prisma.receivable.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });

  const amt = amount ? parseFloat(amount) : Number(existing.amount);
  const paid = paidAmount !== undefined ? parseFloat(paidAmount) : Number(existing.paidAmount);
  const baseAmount = exchangeRate ? amt * parseFloat(exchangeRate) : Number(existing.baseAmount);

  // 自动计算对账状态
  let newStatus = status ?? existing.status;
  if (status === undefined) {
    if (paid <= 0) newStatus = "UNRECONCILED";
    else if (paid < amt) newStatus = "PARTIAL";
    else newStatus = "RECONCILED";
  }

  const rec = await prisma.receivable.update({
    where: { id: parseInt(id) },
    data: {
      amount: amt,
      currency: currency ?? existing.currency,
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : existing.exchangeRate,
      baseAmount,
      paidAmount: paid,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate,
      status: newStatus,
      remark: remark !== undefined ? remark : existing.remark,
    },
    include: { student: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json(rec);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const existing = await prisma.receivable.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
  await prisma.receivable.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
