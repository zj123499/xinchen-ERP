import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

function genInvoiceNo() {
  const now = new Date();
  const prefix = `INV${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const seq = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `${prefix}${seq}`;
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") || "";
  const status = searchParams.get("status") || "";
  const type = searchParams.get("type") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

  const where: Record<string, unknown> = { tenantId };
  if (status) where.status = status;
  if (type) where.type = type;
  if (keyword) {
    where.OR = [
      { invoiceNo: { contains: keyword } },
      { student: { name: { contains: keyword } } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
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
    studentId, orderId, type = "SALES", amount, currency = "CNY",
    taxRate, taxAmount, issuedAt, dueDate, remark, invoiceNo,
  } = body;

  if (!type) return NextResponse.json({ error: "请选择发票类型" }, { status: 400 });
  if (!amount || parseFloat(amount) <= 0) {
    return NextResponse.json({ error: "请输入有效金额" }, { status: 400 });
  }

  if (studentId) {
    const student = await prisma.student.findFirst({ where: { id: parseInt(studentId), tenantId } });
    if (!student) return NextResponse.json({ error: "学生不存在" }, { status: 404 });
  }

  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      invoiceNo: invoiceNo || genInvoiceNo(),
      studentId: studentId ? parseInt(studentId) : null,
      orderId: orderId ? parseInt(orderId) : null,
      type,
      amount: parseFloat(amount),
      currency,
      taxRate: taxRate ? parseFloat(taxRate) : null,
      taxAmount: taxAmount ? parseFloat(taxAmount) : null,
      status: "DRAFT",
      issuedAt: issuedAt ? new Date(issuedAt) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      remark: remark || null,
    },
    include: { student: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json(invoice, { status: 201 });
}
