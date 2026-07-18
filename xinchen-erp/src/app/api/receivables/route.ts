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
  const keyword = searchParams.get("keyword") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

  const where: Record<string, unknown> = { tenantId };
  if (status) where.status = status;
  if (keyword) {
    where.OR = [
      { contractNo: { contains: keyword } },
      { invoiceNo: { contains: keyword } },
      { student: { name: { contains: keyword } } },
      { student: { phone: { contains: keyword } } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.receivable.count({ where }),
    prisma.receivable.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { dueDate: "asc" },
      include: {
        student: { select: { id: true, name: true, phone: true } },
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
  const {
    studentId, orderId, contractNo, invoiceNo, amount, currency = "CNY",
    exchangeRate, fiscalYear, fiscalMonth, dueDate, remark,
  } = body;

  if (!studentId) return NextResponse.json({ error: "请选择学生" }, { status: 400 });
  if (!amount || parseFloat(amount) <= 0) {
    return NextResponse.json({ error: "请输入有效金额" }, { status: 400 });
  }

  const student = await prisma.student.findFirst({ where: { id: parseInt(studentId), tenantId } });
  if (!student) return NextResponse.json({ error: "学生不存在" }, { status: 404 });

  const recDate = dueDate ? new Date(dueDate) : new Date();
  const fy = fiscalYear ? parseInt(fiscalYear) : recDate.getFullYear();
  const fm = fiscalMonth ? parseInt(fiscalMonth) : recDate.getMonth() + 1;
  const baseAmount = exchangeRate ? parseFloat(amount) * parseFloat(exchangeRate) : parseFloat(amount);

  const receivable = await prisma.receivable.create({
    data: {
      tenantId,
      studentId: parseInt(studentId),
      orderId: orderId ? parseInt(orderId) : null,
      contractNo: contractNo || null,
      invoiceNo: invoiceNo || null,
      amount: parseFloat(amount),
      currency,
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : 1,
      baseAmount,
      paidAmount: 0,
      fiscalYear: fy,
      fiscalMonth: fm,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "UNRECONCILED",
      remark: remark || null,
    },
    include: { student: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json(receivable, { status: 201 });
}
