import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const _denied = await requirePermission(request, "settings:manage");
  if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const income = await prisma.income.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { student: { select: { id: true, name: true, phone: true } } },
  });
  if (!income) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json(income);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const _denied = await requirePermission(request, "settings:manage");
  if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const body = await request.json();
  const { incomeType, amount, currency, exchangeRate, recognizedAt, invoiceNo, remark } = body;

  const existing = await prisma.income.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });

  const recDate = recognizedAt ? new Date(recognizedAt) : existing.recognizedAt;
  const baseAmount = exchangeRate
    ? parseFloat(amount) * parseFloat(exchangeRate)
    : existing.baseAmount;

  const income = await prisma.income.update({
    where: { id: parseInt(id) },
    data: {
      incomeType: incomeType ?? existing.incomeType,
      amount: amount ? parseFloat(amount) : existing.amount,
      currency: currency ?? existing.currency,
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : existing.exchangeRate,
      baseAmount,
      fiscalYear: recDate.getFullYear(),
      fiscalMonth: recDate.getMonth() + 1,
      recognizedAt: recDate,
      invoiceNo: invoiceNo ?? existing.invoiceNo,
      remark: remark !== undefined ? remark : existing.remark,
    },
    include: { student: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json(income);
}

export async function DELETE(request: NextRequest, {
 const _denied = await requirePermission(request, "settings:manage");
 if (_denied) return _denied;
 params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const existing = await prisma.income.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
  await prisma.income.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
