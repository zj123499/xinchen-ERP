import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";;
import { getContext } from "@/lib/context";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const id = parseInt((await params).id);
  const version = await prisma.configVersion.findFirst({ where: { id, tenantId } });
  if (!version) return NextResponse.json({ error: "版本不存在" }, { status: 404 });
  return NextResponse.json(version);
}
