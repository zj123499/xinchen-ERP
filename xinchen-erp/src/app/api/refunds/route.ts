import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitApproval } from "@/lib/approvalBusiness";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

function genRefundNo() {
  const now = new Date();
  const prefix = `RF${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const seq = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `${prefix}${seq}`;
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
  const { userId, tenantId } = getContext(request);
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

  // 退费提交即触发审批流（RETURN 场景）；未配置审批流则保持 PENDING 由人工处理
  let approvalRecordId: number | null = null;
  try {
    approvalRecordId = await submitApproval({
      tenantId,
      applicantId: userId,
      businessType: "REFUND",
      businessId: refund.id,
      comment: reason || undefined,
    });
    if (approvalRecordId) {
      await prisma.refund.update({ where: { id: refund.id }, data: { approvalRecordId } });
    }
  } catch {
    // 未配置审批流：退费停留在 PENDING，不阻断创建
  }

  return NextResponse.json({ ...refund, approvalRecordId }, { status: 201 });
}
