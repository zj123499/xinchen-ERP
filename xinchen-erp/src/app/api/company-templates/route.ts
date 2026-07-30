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
  const list = await prisma.companyTemplate.findMany({
    where: { tenantId, status: true },
    orderBy: { createdAt: "desc" },
  });
  const total = await prisma.companyTemplate.count({ where: { tenantId, status: true } });
  return NextResponse.json({ list, total });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { name, cloudAccount, cloudAccountPassword, cloudLoginPhone, icpCompany, legalRepresentative, remark } = body;
  if (!name) return NextResponse.json({ error: "请填写模板名称" }, { status: 400 });
  const t = await prisma.companyTemplate.create({
    data: {
      tenantId, name,
      cloudAccount: cloudAccount || null,
      cloudAccountPassword: cloudAccountPassword || null,
      cloudLoginPhone: cloudLoginPhone || null,
      icpCompany: icpCompany || null,
      legalRepresentative: legalRepresentative || null,
      remark: remark || null,
    },
  });
  return NextResponse.json(t, { status: 201 });
}