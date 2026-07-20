import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permission";

const ROLE_VIEW_MAP: Record<string, string[]> = {
  general_manager: ["leads:view", "students:view", "contracts:view", "payments:view", "applications:view", "visits:view", "reports:view"],
  operations_director: ["leads:view", "students:view", "contracts:view", "payments:view", "applications:view", "visits:view", "reports:view"],
  marketing_specialist: ["leads:view", "students:view", "contracts:view", "visits:view"],
  network_operator: ["leads:view", "students:view", "contracts:view", "visits:view"],
  live_streamer: ["leads:view", "visits:view"],
  newmedia_manager: ["leads:view", "students:view", "visits:view", "reports:view"],
  newmedia_operator: ["leads:view", "visits:view"],
  academic_advisor: ["students:view", "applications:view", "contracts:view", "visits:view"],
  document_application: ["students:view", "applications:view", "visits:view"],
  finance: ["payments:view", "contracts:view", "reports:view"],
};

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
    roles: (request.headers.get("x-user-roles") || "").split(",").filter(Boolean),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId, roles } = getContext(request);
  if (!isAdmin(roles)) return NextResponse.json({ error: "only admin" }, { status: 403 });

  const allRoles = await prisma.role.findMany({ where: { tenantId }, orderBy: { id: "asc" } });
  const perms = await prisma.permission.findMany({
    where: { code: { in: ["leads:view", "students:view", "contracts:view", "payments:view", "applications:view", "visits:view", "reports:view"] } },
    select: { id: true, code: true },
  });
  const permMap = new Map(perms.map((p) => [p.code, p.id]));
  const rp = await prisma.rolePermission.findMany({
    where: { role: { tenantId }, permission: { code: { in: [...permMap.keys()] } } },
    select: { roleId: true, permission: { select: { code: true } } },
  });
  const rolePerms = new Map<number, Set<string>>();
  for (const x of rp) {
    if (!rolePerms.has(x.roleId)) rolePerms.set(x.roleId, new Set());
    rolePerms.get(x.roleId)!.add(x.permission.code);
  }

  const report = allRoles.map((role) => {
    const current = rolePerms.get(role.id) || new Set();
    const desired = role.code === "admin" ? [...permMap.keys()] : (ROLE_VIEW_MAP[role.code] || []);
    const missing = desired.filter((c) => !current.has(c));
    return { id: role.id, code: role.code, name: role.name, current: [...current].filter((c) => permMap.has(c)), desired, missing, complete: missing.length === 0 };
  });

  return NextResponse.json({
    summary: { totalRoles: report.length, completeCount: report.filter((r) => r.complete).length, incompleteCount: report.filter((r) => !r.complete).length },
    roles: report,
  });
}

export async function POST(request: NextRequest) {
  const { tenantId, roles } = getContext(request);
  if (!isAdmin(roles)) return NextResponse.json({ error: "only admin" }, { status: 403 });

  const perms = await prisma.permission.findMany({
    where: { code: { in: ["leads:view", "students:view", "contracts:view", "payments:view", "applications:view", "visits:view", "reports:view"] } },
    select: { id: true, code: true },
  });
  const permMap = new Map(perms.map((p) => [p.code, p.id]));
  const allRoles = await prisma.role.findMany({ where: { tenantId, code: { not: "admin" } } });

  let added = 0, skipped = 0;
  const details: string[] = [];

  for (const role of allRoles) {
    const desired = ROLE_VIEW_MAP[role.code] || [];
    if (desired.length === 0) { skipped += 1; continue; }

    const existing = await prisma.rolePermission.findMany({
      where: { roleId: role.id, permission: { code: { in: desired } } },
      select: { permission: { select: { code: true } } },
    });
    const existingCodes = new Set(existing.map((e) => e.permission.code));
    const toAdd = desired.filter((c) => !existingCodes.has(c));

    for (const code of toAdd) {
      const pid = permMap.get(code);
      if (!pid) continue;
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: pid } });
      added += 1;
    }
    if (toAdd.length > 0) details.push(role.name + " +" + toAdd.join(", "));
    else skipped += 1;
  }

  return NextResponse.json({ totalRoles: allRoles.length, added, skipped, details, message: added > 0 ? added + " 项配置完成" : "无需更新" });
}
