/**
 * 系统配置 API
 * GET  /api/system-configs - 获取配置列表
 * POST /api/system-configs - 创建/更新配置
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const configs = await prisma.systemConfig.findMany({
    where: { tenantId },
    orderBy: { configKey: "asc" },
  });

  // 转为 key-value 对象
  const configMap: Record<string, any> = {};
  configs.forEach((c) => {
    configMap[c.configKey] = c.configValue;
  });

  return NextResponse.json({ list: configs, configMap });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { configKey, configValue, description } = body;

  if (!configKey) {
    return NextResponse.json({ error: "配置键为必填项" }, { status: 400 });
  }

  // upsert：存在则更新，不存在则创建
  const config = await prisma.systemConfig.upsert({
    where: {
      tenantId_configKey: { tenantId, configKey },
    },
    update: {
      configValue: configValue,
      ...(description !== undefined && { description }),
    },
    create: {
      tenantId,
      configKey,
      configValue: configValue,
      description: description || null,
    },
  });

  return NextResponse.json(config, { status: 201 });
}
