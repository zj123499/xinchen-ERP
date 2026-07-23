import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permission";

export async function POST(request: NextRequest) {
  const roles = (request.headers.get("x-user-roles") || "").split(",").filter(Boolean);
  if (!isAdmin(roles)) return NextResponse.json({ error: "仅管理员" }, { status: 403 });

  const mgmt = await prisma.menu.upsert({
    where: { code: "partners_mgmt" },
    update: { name: "合作方管理", path: null, icon: "partners", type: "dir", visible: true, sort: 8 },
    create: { code: "partners_mgmt", name: "合作方管理", path: null, icon: "partners", type: "dir", sort: 8, visible: true },
  });

  const school = await prisma.menu.upsert({
    where: { code: "partner_schools" },
    update: { name: "合作院校", path: "/partner-schools", icon: "partners", parentId: mgmt.id, type: "menu", visible: true, sort: 1 },
    create: { code: "partner_schools", name: "合作院校", path: "/partner-schools", icon: "partners", parentId: mgmt.id, type: "menu", sort: 1, visible: true },
  });

  const oldPartners = await prisma.menu.findUnique({ where: { code: "partners" } });
  if (oldPartners) {
    await prisma.menu.update({
      where: { id: oldPartners.id },
      data: { parentId: mgmt.id, name: "合作方", sort: 2, visible: true },
    });
  }

  const oldRoles = oldPartners ? await prisma.roleMenu.findMany({ where: { menuId: oldPartners.id } }) : [];
  let added = 0;
  for (const rm of oldRoles) {
    for (const mid of [mgmt.id, school.id]) {
      const exists = await prisma.roleMenu.findFirst({ where: { roleId: rm.roleId, menuId: mid } });
      if (!exists) { await prisma.roleMenu.create({ data: { roleId: rm.roleId, menuId: mid } }); added++; }
    }
  }

  return NextResponse.json({ success: true, schoolId: school.id, rolesUpdated: oldRoles.length, added });
}
