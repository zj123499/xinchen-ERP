/**
 * 产品组合（套餐/捆绑）API（产品资源中心）
 * GET  /api/product-packages - 列表（按父产品筛选）
 * POST /api/product-packages - 新增组合
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const url = new URL(request.url);
  const parentProductId = url.searchParams.get("parentProductId") || "";

  const where: Prisma.ProductPackageWhereInput = { tenantId };
  if (parentProductId) where.parentProductId = parseInt(parentProductId);

  const list = await prisma.productPackage.findMany({
    where,
    include: {
      parentProduct: { select: { id: true, name: true } },
      childProduct: { select: { id: true, name: true, price: true } },
    },
    orderBy: { id: "desc" },
  });

  return NextResponse.json({ list });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { parentProductId, childProductId, discount } = body;

  if (!parentProductId || !childProductId) {
    return NextResponse.json({ error: "父产品和子产品为必填项" }, { status: 400 });
  }
  if (parseInt(parentProductId) === parseInt(childProductId)) {
    return NextResponse.json({ error: "父产品和子产品不能相同" }, { status: 400 });
  }

  const pkg = await prisma.productPackage.create({
    data: {
      tenantId,
      parentProductId: parseInt(parentProductId),
      childProductId: parseInt(childProductId),
      discount: discount ? parseFloat(discount) : null,
    },
    include: {
      parentProduct: { select: { id: true, name: true } },
      childProduct: { select: { id: true, name: true, price: true } },
    },
  });

  return NextResponse.json(pkg, { status: 201 });
}
