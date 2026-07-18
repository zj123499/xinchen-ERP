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
  const serviceType = searchParams.get("serviceType") || "";
  const status = searchParams.get("status") || "";
  const keyword = searchParams.get("keyword") || "";

  const where: any = { tenantId };
  if (serviceType) where.serviceType = serviceType;
  if (status) where.status = status;
  if (keyword) {
    where.OR = [
      { student: { name: { contains: keyword } } },
      { student: { phone: { contains: keyword } } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.overseasService.count({ where }),
    prisma.overseasService.findMany({
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
  const { studentId, serviceType, status, detail } = body;

  if (!studentId || !serviceType) {
    return NextResponse.json({ error: "学生和服务类型为必填项" }, { status: 400 });
  }

  const service = await prisma.overseasService.create({
    data: {
      tenantId,
      studentId: parseInt(studentId),
      serviceType,
      status: status || "pending",
      detail: detail || null,
    },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      tenant: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(service, { status: 201 });
}
