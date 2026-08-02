import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function GET(request: NextRequest, {
 const _denied = await requirePermission(request, "settings:manage");
 if (_denied) return _denied;
 params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const rec = await prisma.payable.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { partner: { select: { id: true, name: true } } },
  });
  if (!rec) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json(rec);
}

export async function PUT(request: NextRequest, {
 const _denied = await requirePermission(request, "settings:manage");
 if (_denied) return _denied;
 params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const body = await request.json();
  const { amount, currency, exchangeRate, paidAmount, dueDate, status, remark } = body;

  const existing = await prisma.payable.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });

  const amt = amount ? parseFloat(amount) : Number(existing.amount);
  const paid = paidAmount !== undefined ? parseFloat(paidAmount) : Number(existing.paidAmount);
  const baseAmount = exchangeRate ? amt * parseFloat(exchangeRate) : Number(existing.baseAmount);

  let newStatus = status ?? existing.status;
  if (status === undefined) {
    if (paid <= 0) newStatus = "UNRECONCILED";
    else if (paid < amt) newStatus = "PARTIAL";
    else newStatus = "RECONCILED";
  }

  const rec = await prisma.payable.update({
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
    include: { partner: { select: { id: true, name: true } } },
  });

  return NextResponse.json(rec);
}

export async function DELETE(request: NextRequest, {
 const _denied = await requirePermission(request, "settings:manage");
 if (_denied) return _denied;
 params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const existing = await prisma.payable.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
  await prisma.payable.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
