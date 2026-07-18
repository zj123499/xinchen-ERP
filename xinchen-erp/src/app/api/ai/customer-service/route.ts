/**
 * AI 客服助手（AI 智能层）
 * POST /api/ai/customer-service
 *   body: { studentId?, question, context?, messages?, save? }
 *   - messages 支持多轮对话（[{role,content}]）
 *   - 无 Key 时：FAQ 质量匹配（关键词打分），命中则返回，否则转人工
 *   - save=true 写入 ai_conversations（CUSTOMER_SERVICE）
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

// 关键词重叠打分，挑最相关 FAQ
function bestFaq(question: string, faqs: { dictKey: string; dictValue: string }[]) {
  const q = question.toLowerCase();
  let best: { f: any; score: number } | null = null;
  for (const f of faqs) {
    const keys = (f.dictKey + " " + f.dictValue).toLowerCase();
    const words = f.dictKey.toLowerCase().split(/[\s,，。、：:]+/).filter(Boolean);
    let score = 0;
    if (q.includes(f.dictKey.toLowerCase())) score += 10;
    for (const w of words) if (w.length >= 2 && q.includes(w)) score += 2;
    // 反向：FAQ 答案中的关键词也在问题中出现
    if (keys && q.includes(keys.slice(0, 4))) score += 3;
    if (score > 0 && (!best || score > best.score)) best = { f, score };
  }
  return best ? best.f : null;
}

export async function POST(request: NextRequest) {
  const { userId, tenantId } = getContext(request);
  const body = await request.json();
  const { studentId, question, context, messages, save } = body;

  if (!question && (!messages || messages.length === 0))
    return NextResponse.json({ error: "问题为必填项" }, { status: 400 });

  const faqs = await prisma.dict.findMany({
    where: { tenantId, groupName: "faq", isEnabled: true },
    take: 50,
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

  // 组装多轮消息
  const chatHistory: { role: "system" | "user" | "assistant"; content: string }[] = [
    {
      role: "system",
      content:
        "你是留学机构客服助手，回答家长关于费用、流程、签证、住宿的常见问题。基于给定知识库回答，语气亲切专业。若问题超出知识库或涉及个人敏感信息，请在结尾标注【建议转人工】。",
    },
  ];
  if (Array.isArray(messages)) {
    for (const m of messages) chatHistory.push({ role: m.role === "ai" ? "assistant" : "user", content: m.content });
  }
  chatHistory.push({
    role: "user",
    content: `知识库：\n${knowledge}\n\n用户问题：${question || (messages?.[messages.length - 1]?.content ?? "")}\n${context ? `补充背景：${context}` : ""}`,
  });

  const ai = await callAi(chatHistory);

  let answer: string;
  let fallback = false;
  let needHuman = false;

  if (ai.fallback) {
    fallback = true;
    const hit = bestFaq(question || messages?.[messages.length - 1]?.content || "", faqs);
    if (hit) {
      answer = hit.dictValue;
    } else {
      answer = "您好，当前未配置 AI 自动回复。建议您留下联系方式，顾问将尽快为您解答。如问题较复杂，可标注【建议转人工】。";
      needHuman = true;
    }
  } else {
    answer = ai.content;
    needHuman = ai.content.includes("转人工") || ai.content.includes("建议人工");
  }

  const result: any = { fallback, answer, needHuman };

  if (save) {
    const conv = await prisma.aiConversation.create({
      data: {
        tenantId,
        type: "CUSTOMER_SERVICE",
        operatorId: userId || null,
        studentId: studentId ? parseInt(studentId) : null,
        title: (question || "客服会话").slice(0, 100),
        input: { question, context },
        output: { answer, needHuman },
        messages: [...(messages || []), { role: "user", content: question }, { role: "ai", content: answer }],
        isFallback: fallback,
      },
    });
    result.id = conv.id;
  }

  return NextResponse.json(result);
}
