import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/permission";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const denied = await requirePermission(request, "contracts:view");
  if (denied) return denied;
  const { tenantId } = getContext(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
  const keyword = url.searchParams.get("keyword") || "";
  const status = url.searchParams.get("status") || "";

  const where: Prisma.PartnerContractWhereInput = { tenantId };
  if (keyword) {
    where.OR = [
      { title: { contains: keyword } },
      { contractNo: { contains: keyword } },
    ];
  }
  if (status) where.status = status;

  const [total, list] = await Promise.all([
    prisma.partnerContract.count({ where }),
    prisma.partnerContract.findMany({
      where,
      include: { partner: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), list });
}

export async function POST(request: NextRequest) {
  const denied = await requirePermission(request, "contracts:create");
  if (denied) return denied;
  const { tenantId, userId } = getContext(request);
  const body = await request.json();
  const { partnerId, contractNo, title, signDate, startDate, endDate, amount, status = "active", remark } = body;

  if (!partnerId || !title) {
    return NextResponse.json({ error: "合作方和合同标题为必填项" }, { status: 400 });
  }

  const contract = await prisma.partnerContract.create({
    data: {
      tenantId,
      partnerId: parseInt(partnerId),
      contractNo: contractNo || `PC-${Date.now().toString(36).toUpperCase()}`,
      title,
      signDate: signDate ? new Date(signDate) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      amount: amount ? parseFloat(amount) : null,
      status,
      remark: remark || null,
      createdBy: userId,
    },
    include: { partner: { select: { id: true, name: true } } },
  });

  return NextResponse.json(contract, { status: 201 });
}
