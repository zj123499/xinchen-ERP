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
  const invoice = await prisma.invoice.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { student: { select: { id: true, name: true, phone: true } } },
  });
  if (!invoice) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { amount, currency, taxRate, taxAmount, status, issuedAt, dueDate, remark } = body;

  const existing = await prisma.invoice.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });

  const invoice = await prisma.invoice.update({
    where: { id: parseInt(id) },
    data: {
      amount: amount ? parseFloat(amount) : existing.amount,
      currency: currency ?? existing.currency,
      taxRate: taxRate !== undefined ? (taxRate ? parseFloat(taxRate) : null) : existing.taxRate,
      taxAmount: taxAmount !== undefined ? (taxAmount ? parseFloat(taxAmount) : null) : existing.taxAmount,
      status: status ?? existing.status,
      issuedAt: issuedAt !== undefined ? (issuedAt ? new Date(issuedAt) : null) : existing.issuedAt,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate,
      remark: remark !== undefined ? remark : existing.remark,
    },
    include: { student: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json(invoice);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const existing = await prisma.invoice.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
  await prisma.invoice.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
