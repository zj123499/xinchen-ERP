import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);

  const users = await prisma.user.findMany({
    where: {
      tenantId,
      isActive: true,
      userRoles: { some: { role: { code: "sales" } } },
    },
    select: {
      id: true,
      realName: true,
      username: true,
    },
    orderBy: { realName: "asc" },
  });

  return NextResponse.json({ list: users });
}
