import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permission";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const _denied = await requirePermission(request, "company_templates:update");
    if (_denied) return _denied;

  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { name, cloudAccount, cloudAccountPassword, cloudLoginPhone, icpCompany, legalRepresentative, remark, status } = body;
  const t = await prisma.companyTemplate.updateMany({
    where: { id: parseInt(id), tenantId },
    data: {
      name, cloudAccount, cloudAccountPassword, cloudLoginPhone,
      icpCompany, legalRepresentative, remark,
      status: status !== false,
    },
  });
  if (!t.count) return NextResponse.json({ error: "模板不存在" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const _denied = await requirePermission(request, "company_templates:delete");
    if (_denied) return _denied;

  const { tenantId } = getContext(request);
  const { id } = await params;
  await prisma.companyTemplate.updateMany({
    where: { id: parseInt(id), tenantId },
    data: { status: false },
  });
  return NextResponse.json({ success: true });
}