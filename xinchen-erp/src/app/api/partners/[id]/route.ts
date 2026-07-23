import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;

  const partner = await prisma.partner.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!partner) return NextResponse.json({ error: "合作方不存在" }, { status: 404 });
  return NextResponse.json(partner);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const {
    name, type, country, contactName, contactPhone,
    contactEmail, commissionRate, status,
  } = body;

  const existing = await prisma.partner.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "合作方不存在" }, { status: 404 });

  const partner = await prisma.partner.update({
    where: { id: parseInt(id) },
    data: {
      name: name || existing.name,
      type: type || existing.type,
      country: country !== undefined ? country : existing.country,
      contactName: contactName !== undefined ? contactName : existing.contactName,
      contactPhone: contactPhone !== undefined ? contactPhone : existing.contactPhone,
      contactEmail: contactEmail !== undefined ? contactEmail : existing.contactEmail,
      commissionRate: commissionRate !== undefined ? (commissionRate ? parseFloat(commissionRate) : null) : existing.commissionRate,
      status: status !== undefined ? status : existing.status,
    },
  });

  return NextResponse.json(partner);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.partner.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "合作方不存在" }, { status: 404 });

  await prisma.partner.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
