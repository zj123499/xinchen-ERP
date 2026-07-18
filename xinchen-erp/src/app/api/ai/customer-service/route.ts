/**
 * AI 客服助手（AI 智能层）
 * POST /api/ai/customer-service
 *  body: { question, context? }
 * 基于 FAQ/院校信息/政策 自动回答家长常见问题，复杂问题标记转人工
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callAi } from "@/lib/ai-gateway";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { question, context } = body;

  if (!question) return NextResponse.json({ error: "问题为必填项" }, { status: 400 });

  // 检索 FAQ（数据字典 faq 分组）与院校/国家信息作为知识库
  const faqs = await prisma.dict.findMany({
    where: { tenantId, groupName: "faq", isEnabled: true },
    take: 30,
  });
  const countries = await prisma.country.findMany({
    where: { tenantId },
    select: { name: true, visaPolicy: true },
    take: 20,
  });

  const knowledge = [
    ...faqs.map((f) => `Q: ${f.dictKey}\nA: ${f.dictValue}`),
    ...countries.map((c) => `国家：${c.name}；签证政策：${JSON.stringify(c.visaPolicy || {})}`),
  ].join("\n");

  const ai = await callAi([
    {
      role: "system",
      content:
        "你是留学机构客服助手，回答家长关于费用、流程、签证、住宿的常见问题。基于给定知识库回答，语气亲切专业。若问题超出知识库或涉及个人敏感信息，请在结尾标注【建议转人工】。",
    },
    {
      role: "user",
      content: `知识库：\n${knowledge}\n\n用户问题：${question}\n${context ? `补充背景：${context}` : ""}`,
    },
  ]);

  if (ai.fallback) {
    // 降级：命中 FAQ 关键词则返回，否则提示转人工
    const hit = faqs.find((f) => question.includes(f.dictKey) || f.dictValue.includes(question));
    return NextResponse.json({
      fallback: true,
      answer: hit
        ? hit.dictValue
        : "您好，当前未配置 AI 自动回复。建议您留下联系方式，顾问将尽快为您解答。如问题较复杂，可标注【建议转人工】。",
      needHuman: !hit,
    });
  }

  return NextResponse.json({
    fallback: false,
    answer: ai.content,
    needHuman: ai.content.includes("转人工") || ai.content.includes("建议人工"),
  });
}
