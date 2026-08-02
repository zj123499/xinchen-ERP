import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


function genRefundNo() {
  const now = new Date();
  const prefix = `RF${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const seq = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `${prefix}${seq}`;
}

export async function GET(request: NextRequest) {

const _denied = await requirePermission(request, "settings:manage");

if (_denied) return _denied;


  const { tenantId } = getServerContext(request);
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

  const where: Record<string, unknown> = { tenantId };
  if (status) where.status = status;
  if (keyword) {
    where.OR = [
      { refundNo: { contains: keyword } },
      { student: { name: { contains: keyword } } },
      { student: { phone: { contains: keyword } } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.refund.count({ where }),
    prisma.refund.findMany({
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

const _denied = await requirePermission(request, "settings:manage");

if (_denied) return _denied;


  const { userId, tenantId } = getServerContext(request);
  const body = await request.json();
  const {
    studentId, orderId, contractId, amount, currency = "CNY",
    exchangeRate, reason, remark,
  } = body;

  if (!studentId) return NextResponse.json({ error: "请选择学生" }, { status: 400 });
  if (!amount || parseFloat(amount) <= 0) {
    return NextResponse.json({ error: "请输入有效金额" }, { status: 400 });
  }

  const student = await prisma.student.findFirst({ where: { id: parseInt(studentId), tenantId } });
  if (!student) return NextResponse.json({ error: "学生不存在" }, { status: 404 });

  const baseAmount = exchangeRate ? parseFloat(amount) * parseFloat(exchangeRate) : parseFloat(amount);

  const refund = await prisma.refund.create({
    data: {
      tenantId,
      studentId: parseInt(studentId),
      orderId: orderId ? parseInt(orderId) : null,
      contractId: contractId ? parseInt(contractId) : null,
      refundNo: genRefundNo(),
      amount: parseFloat(amount),
      currency,
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : 1,
      baseAmount,
      reason: reason || null,
      status: "PENDING",
      remark: remark || null,
    },
    include: { student: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json(refund, { status: 201 });
}
