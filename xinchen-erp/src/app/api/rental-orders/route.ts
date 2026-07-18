import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const status = searchParams.get("status") || "";
  const city = searchParams.get("city") || "";
  const keyword = searchParams.get("keyword") || "";

  const where: any = { tenantId };
  if (status) where.status = status;
  if (city) where.city = city;
  if (keyword) {
    where.OR = [
      { address: { contains: keyword } },
      { student: { name: { contains: keyword } } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.rentalOrder.count({ where }),
    prisma.rentalOrder.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { id: "desc" },
      include: {
        student: { select: { id: true, name: true, phone: true } },
        tenant: { select: { id: true, name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
    list,
  });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { studentId, city, address, moveInDate, moveOutDate, monthlyRent, currency, status } = body;

  if (!studentId || !city || !moveInDate || monthlyRent === undefined) {
    return NextResponse.json({ error: "学生、城市、入住日期和月租金为必填项" }, { status: 400 });
  }

  const order = await prisma.rentalOrder.create({
    data: {
      tenantId,
      studentId: parseInt(studentId),
      city,
      address: address || null,
      moveInDate: new Date(moveInDate),
      moveOutDate: moveOutDate ? new Date(moveOutDate) : null,
      monthlyRent: parseFloat(monthlyRent),
      currency: currency || "CNY",
      status: status || "active",
    },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      tenant: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(order, { status: 201 });
}
