import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";
import { encrypt } from "@/lib/crypto";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const _denied = await requirePermission(request, "sites:view");
  if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;

  const site = await prisma.site.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      resolvedServer: { select: { id: true, name: true, address: true } },
      template: { select: { id: true, name: true } },
    },
  });

  if (!site) return NextResponse.json({ error: "站点不存在" }, { status: 404 });
  return NextResponse.json(site);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const _denied = await requirePermission(request, "sites:update");
  if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const body = await request.json();
  const { name, domain, status, icpCompany, legalRepresentative, domainExpiresAt,
    baiduAnalyticsAccount, cloudAccount, cloudAccountPassword, cloudLoginPhone,
    baiduSearchResourceAccount, resolvedServerId, templateId } = body;

  const existing = await prisma.site.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "站点不存在" }, { status: 404 });

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (domain !== undefined) updateData.domain = domain;
  if (status !== undefined) updateData.status = status;
  if (icpCompany !== undefined) updateData.icpCompany = icpCompany || null;
  if (legalRepresentative !== undefined) updateData.legalRepresentative = legalRepresentative || null;
  if (domainExpiresAt !== undefined) updateData.domainExpiresAt = domainExpiresAt ? new Date(domainExpiresAt) : null;
  if (baiduAnalyticsAccount !== undefined) updateData.baiduAnalyticsAccount = baiduAnalyticsAccount || null;
  if (cloudAccount !== undefined) updateData.cloudAccount = cloudAccount || null;
  if (cloudAccountPassword !== undefined) updateData.cloudAccountPassword = cloudAccountPassword ? encrypt(cloudAccountPassword) : null;
  if (cloudLoginPhone !== undefined) updateData.cloudLoginPhone = cloudLoginPhone || null;
  if (baiduSearchResourceAccount !== undefined) updateData.baiduSearchResourceAccount = baiduSearchResourceAccount || null;
  if (resolvedServerId !== undefined) updateData.resolvedServerId = resolvedServerId ? parseInt(resolvedServerId) : null;
  if (templateId !== undefined) updateData.templateId = templateId ? parseInt(templateId) : null;

  const site = await prisma.site.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  return NextResponse.json(site);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const _denied = await requirePermission(request, "sites:delete");
  if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;

  const existing = await prisma.site.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "站点不存在" }, { status: 404 });

  await prisma.site.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}