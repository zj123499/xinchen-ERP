/**
 * AI 文书助手（AI 智能层）
 * POST /api/ai/writing
 *   body: { studentId?, type, studentBackground, targetMajor, targetInstitution, requirements, relatedId?, save? }
 *   - studentId 可预填学生背景
 *   - relatedId 可关联 copywriter_tasks.id，保存时同时回写到任务 content
 *   - save=true 写入 ai_conversations（WRITING）
 * GET  /api/ai/writing?studentId=  -> 历史文书草稿
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

async function fillBgFromStudent(studentId: number, tenantId: number) {
  const s = await prisma.student.findFirst({
    where: { id: studentId, tenantId },
    select: { name: true, currentMajor: true, education: true, gpa: true, targetMajor: true, targetDegree: true },
  });
  if (!s) return null;
  return `学生：${s.name}；本科院校：${s.currentMajor || "未知"}；学历：${s.education || "未知"}；GPA：${s.gpa ? String(s.gpa) : "未知"}；目标专业：${s.targetMajor || "未知"}；目标学位：${s.targetDegree || "未知"}`;
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const studentId = parseInt(request.nextUrl.searchParams.get("studentId") || "0");
  const list = await prisma.aiConversation.findMany({
    where: { tenantId, type: "WRITING", ...(studentId ? { studentId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const { userId, tenantId } = getContext(request);
  const body = await request.json();
  const { studentId, type, studentBackground, targetMajor, targetInstitution, requirements, relatedId, save } = body;

  let background = studentBackground || "";
  if (studentId && !background) {
    const bg = await fillBgFromStudent(parseInt(studentId), tenantId);
    if (bg) background = bg;
  }

  const systemMap: Record<string, string> = {
    PS: "你是留学文书顾问，帮助学生梳理个人陈述(PS)大纲与写作要点，不代写整篇，而是提供结构与初稿灵感。",
    CV: "你是留学简历顾问，帮助学生优化学术/经历简历，给出模块建议与润色方向。",
    RECOMMENDATION: "你是推荐信顾问，帮助老师梳理推荐信框架与核心亮点。",
  };

  const ai = await callAi([
    { role: "system", content: systemMap[type || "PS"] || systemMap.PS },
    {
      role: "user",
      content: `文书类型：${type || "PS"}\n学生背景：${background || "未知"}\n目标专业：${targetMajor || "未知"}\n目标院校：${targetInstitution || "未知"}\n院校要求：${requirements || "无"}\n\n请输出结构化辅助内容（大纲/框架/要点）。`,
    },
  ]);

  let draft: string;
  let fallback = false;
  let note = "";
  if (ai.fallback) {
    fallback = true;
    const templates: Record<string, string> = {
      PS: `一、开篇：留学动机与兴趣起源\n二、学术背景：专业课程、GPA、研究经历\n三、实践经历：实习/项目/竞赛亮点\n四、为何选择该校该专业\n五、职业规划与贡献\n（配置 AI_GATEWAY_API_KEY 后，可基于上述结构生成更贴合的初稿）`,
      CV: `一、个人信息与教育背景\n二、学术成绩与荣誉\n三、科研/实习经历（STAR 法则）\n四、技能与证书（语言/专业）\n五、课外活动与社会贡献\n（配置 AI_GATEWAY_API_KEY 后生成定制建议）`,
      RECOMMENDATION: `一、推荐人与申请人关系说明\n二、学术能力评价（具体事例）\n三、个人品质与潜力\n四、综合推荐意见\n（配置 AI_GATEWAY_API_KEY 后生成定制框架）`,
    };
    draft = templates[type || "PS"];
    note = "当前未配置 AI API Key，已返回标准模板。";
  } else {
    draft = ai.content;
  }

  const result: any = { fallback, type: type || "PS", draft, note };

  if (save) {
    const conv = await prisma.aiConversation.create({
      data: {
        tenantId,
        type: "WRITING",
        operatorId: userId || null,
        studentId: studentId ? parseInt(studentId) : null,
        relatedId: relatedId ? parseInt(relatedId) : null,
        title: `${type || "PS"}·${targetInstitution || "通用"}`,
        input: { type, studentBackground: background, targetMajor, targetInstitution, requirements },
        output: { draft },
        isFallback: fallback,
      },
    });
    result.id = conv.id;
    // 若关联文书任务，回写草稿到任务 content
    if (relatedId) {
      await prisma.copywriterTask.update({
        where: { id: parseInt(relatedId) },
        data: { content: draft },
      }).catch(() => {});
    }
  }

  return NextResponse.json(result);
}
