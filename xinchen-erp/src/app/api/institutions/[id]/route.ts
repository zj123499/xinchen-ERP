/**
 * 院校详情 API
 * GET    /api/institutions/:id
 * PUT    /api/institutions/:id
 * DELETE /api/institutions/:id
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const institution = await prisma.institution.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { country: { select: { id: true, name: true } }, _count: { select: { majors: true } } },
  });
  if (!institution) return NextResponse.json({ error: "院校不存在" }, { status: 404 });
  return NextResponse.json(institution);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { name, countryId, type, ranking, tuitionRange, requirements, remark } = body;

  const existing = await prisma.institution.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "院校不存在" }, { status: 404 });

  const institution = await prisma.institution.update({
    where: { id: parseInt(id) },
    data: {
      name: name ?? existing.name,
      countryId: countryId ? parseInt(countryId) : existing.countryId,
      type: type ?? existing.type,
      ranking: ranking === undefined ? existing.ranking : ranking ? parseInt(ranking) : null,
      tuitionRange: tuitionRange === undefined ? existing.tuitionRange : tuitionRange || null,
      requirements: requirements === undefined ? existing.requirements : requirements,
      remark: remark === undefined ? existing.remark : remark || null,
    },
  });
  return NextResponse.json(institution);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const existing = await prisma.institution.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "院校不存在" }, { status: 404 });
  await prisma.institution.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
