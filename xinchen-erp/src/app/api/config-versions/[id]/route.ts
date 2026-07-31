import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permission";

function getContext(request: NextRequest) {
  return { tenantId: parseInt(request.headers.get("x-tenant-id") || "0") };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const _denied = await requirePermission(request, "settings:manage");
    if (_denied) return _denied;

  const { tenantId } = getContext(request);
  const id = parseInt((await params).id);
  const version = await prisma.configVersion.findFirst({ where: { id, tenantId } });
  if (!version) return NextResponse.json({ error: "版本不存在" }, { status: 404 });
  return NextResponse.json(version);
}
