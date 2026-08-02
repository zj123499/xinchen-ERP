/**
 * 产品详情 API
 * GET    /api/products/:id
 * PUT    /api/products/:id
 * DELETE /api/products/:id
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const _denied = await requirePermission(request, "products:view");
    if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      businessLine: { select: { id: true, name: true } },
      country: { select: { id: true, name: true } },
      institution: { select: { id: true, name: true } },
      childPackages: { include: { childProduct: { select: { id: true, name: true, price: true } } } },
      parentPackages: { include: { parentProduct: { select: { id: true, name: true, price: true } } } },
    },
  });
  if (!product) return NextResponse.json({ error: "产品不存在" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const _denied = await requirePermission(request, "products:update");
    if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const body = await request.json();
  const { name, businessLineId, countryId, institutionId, description, price, commissionRate, status, remark } = body;

  const existing = await prisma.product.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "产品不存在" }, { status: 404 });

  const product = await prisma.product.update({
    where: { id: parseInt(id) },
    data: {
      name: name ?? existing.name,
      businessLineId: businessLineId === undefined ? existing.businessLineId : businessLineId ? parseInt(businessLineId) : null,
      countryId: countryId === undefined ? existing.countryId : countryId ? parseInt(countryId) : null,
      institutionId: institutionId === undefined ? existing.institutionId : institutionId ? parseInt(institutionId) : null,
      description: description === undefined ? existing.description : description,
      price: price === undefined ? existing.price : parseFloat(price),
      commissionRate: commissionRate === undefined ? existing.commissionRate : commissionRate ? parseFloat(commissionRate) : null,
      status: status ?? existing.status,
      remark: remark === undefined ? existing.remark : remark || null,
    },
  });
  return NextResponse.json(product);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const _denied = await requirePermission(request, "products:delete");
    if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const existing = await prisma.product.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "产品不存在" }, { status: 404 });
  await prisma.product.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
