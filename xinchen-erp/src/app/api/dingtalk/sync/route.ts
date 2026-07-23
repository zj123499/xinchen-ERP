/**
 * 钉钉组织架构同步 API
 * POST /api/dingtalk/sync - 手动触发组织架构同步
 * GET  /api/dingtalk/sync - 获取配置状态
 * PUT  /api/dingtalk/sync - 保存 AppKey/AppSecret 配置
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncDingtalkOrganization } from "@/lib/dingtalk/sync";
import { getAppKey, getAppSecret, clearTokenCache } from "@/lib/dingtalk/auth";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "1"),
    roles: (request.headers.get("x-user-roles") || "").split(","),
  };
}

/**
 * GET: 获取配置状态（AppKey 和 AppSecret 都脱敏）
 */
export async function GET(request: NextRequest) {
  const appKey = await getAppKey();
  const appSecret = await getAppSecret();

  return NextResponse.json({
    dingtalk: {
      appKeyMasked: appKey ? "******" + appKey.slice(-4) : "",
      appSecretMasked: appSecret ? "******" + appSecret.slice(-4) : "",
      appKeyConfigured: !!appKey,
      appSecretConfigured: !!appSecret,
      configured: !!appKey && !!appSecret,
    },
    stream: {
      connected: false,
      running: false,
      note: "Stream 模式在独立进程中运行，请使用 'npm run dingtalk:stream' 启动",
    },
  });
}

/**
 * PUT: 保存 AppKey / AppSecret
 */
export async function PUT(request: NextRequest) {
  const { tenantId, roles } = getContext(request);
  if (!roles.includes("admin")) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const body = await request.json();
  const { appKey, appSecret } = body;

  if (!appKey && !appSecret) {
    return NextResponse.json({ error: "请至少填写一项配置" }, { status: 400 });
  }

  const ops: Promise<unknown>[] = [];

  if (appKey !== undefined && appKey !== "") {
    ops.push(
      prisma.systemConfig.upsert({
        where: { tenantId_configKey: { tenantId, configKey: "dingtalk_app_key" } },
        update: { configValue: appKey },
        create: { tenantId, configKey: "dingtalk_app_key", configValue: appKey, description: "钉钉应用 AppKey" },
      })
    );
  }

  if (appSecret !== undefined && appSecret !== "") {
    ops.push(
      prisma.systemConfig.upsert({
        where: { tenantId_configKey: { tenantId, configKey: "dingtalk_app_secret" } },
        update: { configValue: appSecret },
        create: { tenantId, configKey: "dingtalk_app_secret", configValue: appSecret, description: "钉钉应用 AppSecret" },
      })
    );
  }

  await Promise.all(ops);
  clearTokenCache();

  return NextResponse.json({ success: true, message: "配置已保存" });
}

/**
 * POST: 手动触发同步
 */
export async function POST(request: NextRequest) {
  try {
    const roles = request.headers.get("x-user-roles") || "";
    if (!roles.includes("admin")) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const appKey = await getAppKey();
    const appSecret = await getAppSecret();
    if (!appKey || !appSecret) {
      return NextResponse.json({
        success: false,
        error: "请先配置 AppKey 和 AppSecret",
      }, { status: 400 });
    }

    console.log("[DingTalk] 手动触发组织架构同步...");
    const result = await syncDingtalkOrganization();

    return NextResponse.json({
      success: true,
      message: `同步完成：部门${result.departments.created + result.departments.updated}个，员工${result.employees.created + result.employees.updated}人，用户${result.users.created + result.users.updated}人`,
      stats: result,
    });
  } catch (error) {
    console.error("[DingTalk] 同步失败:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "同步失败",
    }, { status: 500 });
  }
}
