/**
 * 钉钉鉴权工具
 * - 获取 access_token（优先从数据库读取 AppKey/AppSecret，回退到环境变量）
 * - 供组织架构同步 / 事件订阅使用
 */

import { prisma } from "@/lib/prisma";

/**
 * 从数据库或环境变量获取 AppKey
 */
export async function getAppKey(): Promise<string> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: {
        tenantId_configKey: { tenantId: 1, configKey: "dingtalk_app_key" },
      },
    });
    if (config?.configValue) {
      return String(config.configValue);
    }
  } catch {
    // 数据库可能未就绪，回退到环境变量
  }
  return process.env.DINGTALK_APP_KEY || "";
}

/**
 * 从数据库或环境变量获取 AppSecret
 */
export async function getAppSecret(): Promise<string> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: {
        tenantId_configKey: { tenantId: 1, configKey: "dingtalk_app_secret" },
      },
    });
    if (config?.configValue) {
      return String(config.configValue);
    }
  } catch {
    // 数据库可能未就绪，回退到环境变量
  }
  return process.env.DINGTALK_APP_SECRET || "";
}

const DINGTALK_API_BASE = "https://oapi.dingtalk.com";

// access_token 缓存
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * 获取钉钉 access_token（旧版 /gettoken 接口，适用于 topapi/v2 系列接口）
 * 文档: https://open.dingtalk.com/document/orgapp/obtain-orgapp-token
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const appKey = await getAppKey();
  const appSecret = await getAppSecret();

  if (!appKey || !appSecret) {
    throw new Error("钉钉 AppKey 或 AppSecret 未配置，请在系统设置 > 钉钉集成中配置");
  }

  // 旧版获取 token 接口：GET /gettoken?appkey=xxx&appsecret=xxx
  // 返回的 access_token 适用于所有 /topapi/v2/ 接口
  const url = `${DINGTALK_API_BASE}/gettoken?appkey=${encodeURIComponent(appKey)}&appsecret=${encodeURIComponent(appSecret)}`;

  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    throw new Error(`获取 access_token 失败: HTTP ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  if (data.errcode !== 0) {
    throw new Error(`获取 access_token 失败: [${data.errcode}] ${data.errmsg}`);
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 7200) * 1000,
  };

  return cachedToken.token;
}

/**
 * 清除 access_token 缓存（配置变更后调用）
 */
export function clearTokenCache() {
  cachedToken = null;
}
