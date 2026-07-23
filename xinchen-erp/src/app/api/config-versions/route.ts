import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

// GET /api/config-versions  配置版本快照列表
// 支持过滤：configType（COMMISSION_RULE/WORKFLOW/FORM_SCHEMA/SYSTEM_CONFIG）、configKey、activeOnly
export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const configType = searchParams.get("configType") || "";
  const configKey = searchParams.get("configKey") || "";
  const activeOnly = searchParams.get("activeOnly") === "true";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

  const where: Record<string, unknown> = { tenantId };
  if (configType) where.configType = configType;
  if (configKey) where.configKey = { contains: configKey };
  if (activeOnly) where.isActive = true;

  const [total, list] = await Promise.all([
    prisma.configVersion.count({ where }),
    prisma.configVersion.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ configKey: "asc" }, { version: "desc" }],
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    list,
  });
}
