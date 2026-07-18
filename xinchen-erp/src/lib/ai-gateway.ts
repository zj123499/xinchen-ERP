/**
 * AI Gateway - 统一 AI 调用入口
 *
 * 设计目标（参考规划 P8）：
 *  - 统一 API 入口，管理 API Key / 模型选择 / 限流 / 缓存
 *  - 支持多模型：gpt-4 / claude / 国内模型（通过 OPENAI 兼容接口）
 *  - 未配置 API Key 时，自动降级为「规则模板」返回，保证功能可用
 *
 * 配置优先级（高 -> 低）：
 *  1. 数据库 systemConfig 表（界面可在「设置-系统配置-AI 智能配置」中填写）
 *     - ai_gateway_base_url  默认 https://api.openai.com/v1
 *     - ai_gateway_api_key
 *     - ai_gateway_model     默认 gpt-4o-mini
 *  2. 环境变量兜底
 *     - AI_GATEWAY_BASE_URL / AI_GATEWAY_API_KEY / AI_GATEWAY_MODEL
 */

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiResponse {
  content: string;
  model: string;
  fallback: boolean; // 是否为降级模板
}

const ENV_BASE_URL = process.env.AI_GATEWAY_BASE_URL || "https://api.openai.com/v1";
const ENV_API_KEY = process.env.AI_GATEWAY_API_KEY || "";
const ENV_MODEL = process.env.AI_GATEWAY_MODEL || "gpt-4o-mini";

// 配置缓存（避免每次请求都查库）；60 秒刷新一次
let cfgCache: { baseUrl: string; apiKey: string; model: string; ts: number } | null = null;
const CFG_TTL = 60 * 1000;

async function loadConfig(): Promise<{ baseUrl: string; apiKey: string; model: string }> {
  const now = Date.now();
  if (cfgCache && now - cfgCache.ts < CFG_TTL) {
    return { baseUrl: cfgCache.baseUrl, apiKey: cfgCache.apiKey, model: cfgCache.model };
  }
  let dbBase = "";
  let dbKey = "";
  let dbModel = "";
  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.systemConfig.findMany({
      where: {
        configKey: { in: ["ai_gateway_base_url", "ai_gateway_api_key", "ai_gateway_model"] },
      },
    });
    const map: Record<string, any> = {};
    rows.forEach((r) => (map[r.configKey] = r.configValue));
    dbBase = (map.ai_gateway_base_url as string) || "";
    dbKey = (map.ai_gateway_api_key as string) || "";
    dbModel = (map.ai_gateway_model as string) || "";
  } catch {
    // 数据库不可用时退回环境变量
  }
  const baseUrl = dbBase || ENV_BASE_URL;
  const apiKey = dbKey || ENV_API_KEY;
  const model = dbModel || ENV_MODEL;
  cfgCache = { baseUrl, apiKey, model, ts: now };
  return { baseUrl, apiKey, model };
}

export async function callAi(messages: AiMessage[]): Promise<AiResponse> {
  const { baseUrl, apiKey, model } = await loadConfig();

  if (!apiKey) {
    return { content: "", model: "rule-fallback", fallback: true };
  }

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.7 }),
    });
    if (!res.ok) return { content: "", model, fallback: true };
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    return { content, model, fallback: false };
  } catch {
    return { content: "", model, fallback: true };
  }
}
