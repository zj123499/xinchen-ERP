/**
 * AI 选校顾问（AI 智能层）
 * POST /api/ai/school-select
 *  body: { gpa, ielts, toefl, budget, targetCountry, targetDegree, targetMajor }
 * 基于院校数据库 + 规则（无 Key 时降级）输出冲/稳/保三档推荐
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
  const { gpa, ielts, toefl, budget, targetCountry, targetDegree, targetMajor } = body;

  // 从院校库检索候选（按国家 + 专业方向）
  const institutions = await prisma.institution.findMany({
    where: {
      tenantId,
      ...(targetCountry ? { country: { name: { contains: targetCountry } } } : {}),
    },
    include: {
      country: { select: { name: true } },
      majors: {
        where: targetMajor ? { OR: [{ name: { contains: targetMajor } }, { category: { contains: targetMajor } }] } : {},
        take: 5,
      },
    },
    take: 30,
    orderBy: { ranking: "asc" },
  });

  // 院校分级规则：按排名分档
  const reach: typeof institutions = [];
  const match: typeof institutions = [];
  const safety: typeof institutions = [];
  for (const inst of institutions) {
    const rank = inst.ranking ?? 9999;
    if (rank <= 100) reach.push(inst);
    else if (rank <= 500) match.push(inst);
    else safety.push(inst);
  }

  const fmt = (list: typeof institutions) =>
    list.slice(0, 5).map((i) => ({
      name: i.name,
      country: i.country?.name,
      ranking: i.ranking,
      tuitionRange: i.tuitionRange,
      matchedMajors: i.majors.map((m) => m.name),
    }));

  const dataBlock = {
    reach: fmt(reach),
    match: fmt(match),
    safety: fmt(safety),
  };

  const profile = `学生背景：GPA ${gpa || "未知"}，雅思 ${ielts || "未知"}，托福 ${toefl || "未知"}，预算 ${budget || "未知"}，目标国家 ${targetCountry || "未知"}，目标学位 ${targetDegree || "未知"}，目标专业 ${targetMajor || "未知"}`;

  const ai = await callAi([
    {
      role: "system",
      content:
        "你是留学选校顾问。根据学生背景与院校数据库候选列表，给出冲刺/匹配/保底三档院校的申请策略建议。使用中文，结构清晰。",
    },
    {
      role: "user",
      content: `${profile}\n\n候选院校数据（已按排名分档）：\n${JSON.stringify(dataBlock, null, 2)}\n\n请给出选校策略与申请建议。`,
    },
  ]);

  if (ai.fallback) {
    // 降级：直接返回结构化的院校分档
    return NextResponse.json({
      fallback: true,
      profile,
      recommendation: dataBlock,
      strategy:
        "（当前未配置 AI API Key，已按院校排名提供冲/稳/保三档候选。配置 AI_GATEWAY_API_KEY 后可获得自然语言选校策略。）",
    });
  }

  return NextResponse.json({ fallback: false, profile, recommendation: dataBlock, strategy: ai.content });
}
