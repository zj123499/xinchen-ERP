/**
 * AI 选校顾问（AI 智能层）
 * POST /api/ai/school-select  body: { studentId?, gpa, ielts, toefl, budget, targetCountry, targetDegree, targetMajor, save? }
 *   - 支持 studentId 预填学生背景
 *   - save=true 时把选校方案写入 ai_conversations（SCHOOL_SELECT）
 * GET  /api/ai/school-select?studentId=  -> 历史选校方案
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

// 从学生档案预填背景
async function fillFromStudent(studentId: number, tenantId: number) {
  const s = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
  if (!s) return null;
  let ielts = "";
  let toefl = "";
  if (s.languageScore && typeof s.languageScore === "object") {
    const ls = s.languageScore as Record<string, any>;
    ielts = ls.ielts ?? ls.IELTS ?? "";
    toefl = ls.toefl ?? ls.TOEFL ?? "";
  }
  return {
    gpa: s.gpa ? String(s.gpa) : "",
    ielts,
    toefl,
    budget: s.budget ? String(s.budget) : "",
    targetCountry: s.targetCountry || "",
    targetDegree: s.targetDegree || "",
    targetMajor: s.targetMajor || "",
  };
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const studentId = parseInt(request.nextUrl.searchParams.get("studentId") || "0");
  const list = await prisma.aiConversation.findMany({
    where: { tenantId, type: "SCHOOL_SELECT", ...(studentId ? { studentId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const { userId, tenantId } = getContext(request);
  const body = await request.json();
  const { studentId, gpa, ielts, toefl, budget, targetCountry, targetDegree, targetMajor, save } = body;

  // 若传 studentId，优先用学生档案填充空字段
  let filled = { gpa: gpa || "", ielts: ielts || "", toefl: toefl || "", budget: budget || "", targetCountry: targetCountry || "", targetDegree: targetDegree || "", targetMajor: targetMajor || "" };
  if (studentId) {
    const stu = await fillFromStudent(parseInt(studentId), tenantId);
    if (stu) {
      filled = {
        gpa: filled.gpa || stu.gpa,
        ielts: filled.ielts || stu.ielts,
        toefl: filled.toefl || stu.toefl,
        budget: filled.budget || stu.budget,
        targetCountry: filled.targetCountry || stu.targetCountry,
        targetDegree: filled.targetDegree || stu.targetDegree,
        targetMajor: filled.targetMajor || stu.targetMajor,
      };
    }
  }

  const institutions = await prisma.institution.findMany({
    where: {
      tenantId,
      ...(filled.targetCountry ? { country: { name: { contains: filled.targetCountry } } } : {}),
    },
    include: {
      country: { select: { name: true } },
      majors: {
        where: filled.targetMajor ? { OR: [{ name: { contains: filled.targetMajor } }, { category: { contains: filled.targetMajor } }] } : {},
        take: 5,
      },
    },
    take: 30,
    orderBy: { ranking: "asc" },
  });

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

  const dataBlock = { reach: fmt(reach), match: fmt(match), safety: fmt(safety) };
  const profile = `学生背景：GPA ${filled.gpa || "未知"}，雅思 ${filled.ielts || "未知"}，托福 ${filled.toefl || "未知"}，预算 ${filled.budget || "未知"}，目标国家 ${filled.targetCountry || "未知"}，目标学位 ${filled.targetDegree || "未知"}，目标专业 ${filled.targetMajor || "未知"}`;

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

  let strategy: string;
  let fallback = false;
  if (ai.fallback) {
    fallback = true;
    strategy =
      "（当前未配置 AI API Key，已按院校排名提供冲/稳/保三档候选。配置 AI_GATEWAY_API_KEY 后可获得自然语言选校策略。）";
  } else {
    strategy = ai.content;
  }

  const result: any = { fallback, profile, recommendation: dataBlock, strategy };

  // 保存选校方案到 ai_conversations
  if (save) {
    const conv = await prisma.aiConversation.create({
      data: {
        tenantId,
        type: "SCHOOL_SELECT",
        operatorId: userId || null,
        studentId: studentId ? parseInt(studentId) : null,
        title: `${filled.targetCountry || "选校"}·${filled.targetMajor || "通用"} 方案`,
        input: filled,
        output: { recommendation: dataBlock, strategy },
        isFallback: fallback,
      },
    });
    result.id = conv.id;
  }

  return NextResponse.json(result);
}
