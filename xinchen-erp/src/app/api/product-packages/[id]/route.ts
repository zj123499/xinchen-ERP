/**
 * 产品组合详情 API
 * DELETE /api/product-packages/:id - 删除组合
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const _denied = await requirePermission(request, "product_packages:delete");
    if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const existing = await prisma.productPackage.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "组合不存在" }, { status: 404 });
  await prisma.productPackage.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
