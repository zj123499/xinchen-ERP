import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return { tenantId: parseInt(request.headers.get("x-tenant-id") || "0") };
}

// POST /api/config-versions/[id]/restore  回滚配置到指定版本
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const id = parseInt((await params).id);
  const version = await prisma.configVersion.findFirst({ where: { id, tenantId } });
  if (!version) return NextResponse.json({ error: "版本不存在" }, { status: 404 });

  if (version.configType === "COMMISSION_RULE") {
    const ruleId = parseInt(version.configKey);
    const rule = await prisma.commissionRule.findFirst({ where: { id: ruleId, tenantId } });
    if (!rule) return NextResponse.json({ error: "关联规则不存在" }, { status: 404 });

    await prisma.commissionRule.update({
      where: { id: ruleId },
      data: {
        config: version.snapshot as object,
        version: version.version,
        configVersionId: version.id,
      },
    });
    return NextResponse.json({ message: `已回滚到版本 v${version.version}` });
  }

  return NextResponse.json({ message: "该配置类型暂不支持回滚" });
}
