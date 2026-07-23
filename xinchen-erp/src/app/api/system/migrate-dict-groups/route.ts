import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permission";

export async function POST(request: NextRequest) {
  const roles = (request.headers.get("x-user-roles") || "").split(",").filter(Boolean);
  if (!isAdmin(roles)) return NextResponse.json({ error: "仅管理员" }, { status: 403 });

  const dicts = await prisma.dict.findMany({ distinct: ["groupName"], select: { groupName: true, tenantId: true } });
  let created = 0;
  for (const d of dicts) {
    await prisma.dictGroup.upsert({
      where: { tenantId_name: { tenantId: d.tenantId, name: d.groupName } },
      update: {},
      create: { tenantId: d.tenantId, name: d.groupName },
    }).then(() => created++).catch(() => {});
  }
  return NextResponse.json({ migrated: created });
}
