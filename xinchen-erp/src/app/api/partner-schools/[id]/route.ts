import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const _denied = await requirePermission(request, "partners:manage");
    if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const body = await request.json();
  const { name, country, city, contactName, contactEmail, responsiblePerson, contractUrl } = body;

  const existing = await prisma.partnerSchool.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "合作院校不存在" }, { status: 404 });

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (country !== undefined) updateData.country = country || null;
  if (city !== undefined) updateData.city = city || null;
  if (contactName !== undefined) updateData.contactName = contactName || null;
  if (contactEmail !== undefined) updateData.contactEmail = contactEmail || null;
  if (responsiblePerson !== undefined) updateData.responsiblePerson = responsiblePerson || null;
  if (contractUrl !== undefined) updateData.contractUrl = contractUrl || null;

  const school = await prisma.partnerSchool.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  return NextResponse.json(school);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getServerContext(request);
  const { id } = await params;

  const existing = await prisma.partnerSchool.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "合作院校不存在" }, { status: 404 });

  await prisma.partnerSchool.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
