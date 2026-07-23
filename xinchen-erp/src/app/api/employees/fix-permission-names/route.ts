import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permission";

// 权限名称和分组映射（code → {name, groupName}）
const PERM_NAME_MAP: Record<string, { name: string; groupName: string }> = {
  // 跟进表单
  followup_pending: { name: "待跟进", groupName: "销售管理" },
  followup_interested: { name: "意向客户", groupName: "销售管理" },
  followup_signed: { name: "已签约客户", groupName: "销售管理" },
  followup_uninterested: { name: "无意向客户", groupName: "销售管理" },
  // 已有权限也补中文名
  "leads:view": { name: "查看线索", groupName: "线索管理" },
  "leads:create": { name: "创建线索", groupName: "线索管理" },
  "students:view": { name: "查看学生", groupName: "学生管理" },
  "contracts:view": { name: "查看合同", groupName: "合同管理" },
  "contracts:delete": { name: "删除合同", groupName: "合同管理" },
  "contracts:update": { name: "编辑合同", groupName: "合同管理" },
  "contracts:create": { name: "创建合同", groupName: "合同管理" },
  "payments:view": { name: "查看财务", groupName: "财务管理" },
  "applications:view": { name: "查看申请", groupName: "申请管理" },
  "visits:view": { name: "查看回访", groupName: "回访管理" },
  "reports:view": { name: "查看报表", groupName: "报表管理" },
  "settings:manage": { name: "系统设置", groupName: "系统管理" },
};

export async function POST(request: NextRequest) {
  const roles = (request.headers.get("x-user-roles") || "").split(",").filter(Boolean);
  if (!isAdmin(roles)) return NextResponse.json({ error: "only admin" }, { status: 403 });

  const codes = Object.keys(PERM_NAME_MAP);
  let updated = 0, created = 0;

  for (const code of codes) {
    const info = PERM_NAME_MAP[code];
    const existing = await prisma.permission.findUnique({ where: { code } });
    if (existing) {
      // 更新名称和分组
      if (existing.name !== info.name || existing.groupName !== info.groupName) {
        await prisma.permission.update({ where: { code }, data: { name: info.name, groupName: info.groupName } });
        updated++;
      }
    } else {
      await prisma.permission.create({ data: { code, name: info.name, groupName: info.groupName } });
      created++;
    }
  }

  return NextResponse.json({ updated, created, message: `更新 ${updated} 项，新建 ${created} 项` });
}
