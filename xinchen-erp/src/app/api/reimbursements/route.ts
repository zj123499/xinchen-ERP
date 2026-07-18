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
  const category = searchParams.get("category") || "";
  const status = searchParams.get("status") || "";

  const where: any = { tenantId };
  if (category) where.category = category;
  if (status) where.status = status;

  const [total, list] = await Promise.all([
    prisma.reimbursement.count({ where }),
    prisma.reimbursement.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ id: "desc" }],
      include: {
        applicant: { select: { id: true, realName: true, username: true } },
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
  const { applicantId, amount, category, description } = body;

  if (!applicantId || amount === undefined || !category) {
    return NextResponse.json({ error: "申请人、金额、费用类别为必填项" }, { status: 400 });
  }

  const reimbursement = await prisma.reimbursement.create({
    data: {
      tenantId,
      applicantId: parseInt(applicantId),
      amount: parseFloat(amount),
      category,
      description: description || null,
      status: "DRAFT",
    },
    include: {
      applicant: { select: { id: true, realName: true, username: true } },
    },
  });

  return NextResponse.json(reimbursement, { status: 201 });
}
