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
  const keyword = searchParams.get("keyword") || "";
  const employeeId = searchParams.get("employeeId") || "";
  const fiscalYear = searchParams.get("fiscalYear") || "";
  const fiscalMonth = searchParams.get("fiscalMonth") || "";
  const status = searchParams.get("status") || "";

  const where: any = { tenantId };
  if (employeeId) where.employeeId = parseInt(employeeId);
  if (fiscalYear) where.fiscalYear = parseInt(fiscalYear);
  if (fiscalMonth) where.fiscalMonth = parseInt(fiscalMonth);
  if (status) where.status = status;
  if (keyword) {
    where.employee = { name: { contains: keyword } };
  }

  const [total, list] = await Promise.all([
    prisma.salary.count({ where }),
    prisma.salary.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ fiscalYear: "desc" }, { fiscalMonth: "desc" }, { id: "desc" }],
      include: {
        employee: { select: { id: true, name: true, employeeNo: true } },
      },
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    list,
  });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { employeeId, fiscalYear, fiscalMonth, baseSalary, bonus, commission, deduction } = body;

  if (!employeeId || !fiscalYear || !fiscalMonth || baseSalary === undefined) {
    return NextResponse.json({ error: "员工、会计年度、会计月份、基本工资为必填项" }, { status: 400 });
  }

  const existing = await prisma.salary.findFirst({
    where: { tenantId, employeeId: parseInt(employeeId), fiscalYear: parseInt(fiscalYear), fiscalMonth: parseInt(fiscalMonth) },
  });
  if (existing) {
    return NextResponse.json({ error: "该员工此会计期已有薪资记录" }, { status: 409 });
  }

  const b = parseFloat(baseSalary) || 0;
  const bn = parseFloat(bonus || "0");
  const cm = parseFloat(commission || "0");
  const dd = parseFloat(deduction || "0");
  const net = b + bn + cm - dd;

  const salary = await prisma.salary.create({
    data: {
      tenantId,
      employeeId: parseInt(employeeId),
      fiscalYear: parseInt(fiscalYear),
      fiscalMonth: parseInt(fiscalMonth),
      baseSalary: b,
      bonus: bn,
      commission: cm,
      deduction: dd,
      netSalary: net,
      status: "draft",
    },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true } },
    },
  });

  return NextResponse.json(salary, { status: 201 });
}
