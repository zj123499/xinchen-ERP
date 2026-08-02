import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";
import { encrypt } from "@/lib/crypto";


export async function GET(request: NextRequest) {
    const _denied = await requirePermission(request, "company_templates:view");
  if (_denied) return _denied;

const { tenantId } = getServerContext(request);
  const list = await prisma.companyTemplate.findMany({
    where: { tenantId, status: true },
    orderBy: { createdAt: "desc" },
    // 排除密码字段
    select: {
      id: true, name: true, cloudAccount: true,
      cloudLoginPhone: true, icpCompany: true, legalRepresentative: true,
      remark: true, status: true, createdAt: true, updatedAt: true, tenantId: true,
    },
  });
  const total = await prisma.companyTemplate.count({ where: { tenantId, status: true } });
  return NextResponse.json({ list, total });
}

export async function POST(request: NextRequest) {
    const _denied = await requirePermission(request, "company_templates:create");
  if (_denied) return _denied;

const { tenantId } = getServerContext(request);
  const body = await request.json();
  const { name, cloudAccount, cloudAccountPassword, cloudLoginPhone, icpCompany, legalRepresentative, remark } = body;
  if (!name) return NextResponse.json({ error: "请填写模板名称" }, { status: 400 });
  const t = await prisma.companyTemplate.create({
    data: {
      tenantId, name,
      cloudAccount: cloudAccount || null,
      cloudAccountPassword: cloudAccountPassword ? encrypt(cloudAccountPassword) : null,
      cloudLoginPhone: cloudLoginPhone || null,
      icpCompany: icpCompany || null,
      legalRepresentative: legalRepresentative || null,
      remark: remark || null,
    },
  });
  return NextResponse.json(t, { status: 201 });
}