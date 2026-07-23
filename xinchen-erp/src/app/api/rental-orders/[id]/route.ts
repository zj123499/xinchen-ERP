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

  const order = await prisma.rentalOrder.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      tenant: { select: { id: true, name: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "租房订单不存在" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { studentId, city, address, moveInDate, moveOutDate, monthlyRent, currency, status } = body;

  const existing = await prisma.rentalOrder.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "租房订单不存在" }, { status: 404 });

  const updateData: any = {};
  if (studentId) updateData.studentId = parseInt(studentId);
  if (city) updateData.city = city;
  if (address !== undefined) updateData.address = address;
  if (moveInDate) updateData.moveInDate = new Date(moveInDate);
  if (moveOutDate !== undefined) updateData.moveOutDate = moveOutDate ? new Date(moveOutDate) : null;
  if (monthlyRent !== undefined) updateData.monthlyRent = parseFloat(monthlyRent);
  if (currency) updateData.currency = currency;
  if (status) updateData.status = status;

  const order = await prisma.rentalOrder.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      student: { select: { id: true, name: true, phone: true } },
      tenant: { select: { id: true, name: true } },
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

  const existing = await prisma.rentalOrder.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "租房订单不存在" }, { status: 404 });

  await prisma.rentalOrder.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
