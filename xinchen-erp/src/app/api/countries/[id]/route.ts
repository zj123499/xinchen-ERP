/**
 * 国家详情 API
 * GET    /api/countries/:id - 详情
 * PUT    /api/countries/:id - 更新
 * DELETE /api/countries/:id - 删除
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
  const country = await prisma.country.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { _count: { select: { institutions: true, products: true } } },
  });
  if (!country) return NextResponse.json({ error: "国家不存在" }, { status: 404 });
  return NextResponse.json(country);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { name, code, region, visaPolicy, remark } = body;

  const existing = await prisma.country.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "国家不存在" }, { status: 404 });

  if (code && code !== existing.code) {
    const dup = await prisma.country.findFirst({ where: { tenantId, code } });
    if (dup) return NextResponse.json({ error: "该国家代码已存在" }, { status: 409 });
  }

  const country = await prisma.country.update({
    where: { id: parseInt(id) },
    data: {
      name: name ?? existing.name,
      code: code ?? existing.code,
      region: region === undefined ? existing.region : region || null,
      visaPolicy: visaPolicy === undefined ? existing.visaPolicy : visaPolicy,
      remark: remark === undefined ? existing.remark : remark || null,
    },
  });
  return NextResponse.json(country);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const existing = await prisma.country.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "国家不存在" }, { status: 404 });
  await prisma.country.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
