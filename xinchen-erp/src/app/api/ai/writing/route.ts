/**
 * AI 文书助手（AI 智能层）
 * POST /api/ai/writing
 *  body: { type: "PS"|"CV"|"RECOMMENDATION", studentBackground, targetMajor, targetInstitution, requirements }
 * 辅助生成 PS 大纲 / 推荐信框架 / 简历优化建议（不替代文书老师）
 */

import { NextRequest, NextResponse } from "next/server";
import { callAi } from "@/lib/ai-gateway";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, studentBackground, targetMajor, targetInstitution, requirements } = body;

  const systemMap: Record<string, string> = {
    PS: "你是留学文书顾问，帮助学生梳理个人陈述(PS)大纲与写作要点，不代写整篇，而是提供结构与初稿灵感。",
    CV: "你是留学简历顾问，帮助学生优化学术/经历简历，给出模块建议与润色方向。",
    RECOMMENDATION: "你是推荐信顾问，帮助老师梳理推荐信框架与核心亮点。",
  };

  const ai = await callAi([
    {
      role: "system",
      content: systemMap[type || "PS"] || systemMap.PS,
    },
    {
      role: "user",
      content:
        `文书类型：${type || "PS"}\n学生背景：${studentBackground || "未知"}\n目标专业：${targetMajor || "未知"}\n目标院校：${targetInstitution || "未知"}\n院校要求：${requirements || "无"}\n\n请输出结构化辅助内容（大纲/框架/要点）。`,
    },
  ]);

  if (ai.fallback) {
    const templates: Record<string, string> = {
      PS: `一、开篇：留学动机与兴趣起源\n二、学术背景：专业课程、GPA、研究经历\n三、实践经历：实习/项目/竞赛亮点\n四、为何选择该校该专业\n五、职业规划与贡献\n（配置 AI_GATEWAY_API_KEY 后，可基于上述结构生成更贴合的初稿）`,
      CV: `一、个人信息与教育背景\n二、学术成绩与荣誉\n三、科研/实习经历（STAR 法则）\n四、技能与证书（语言/专业）\n五、课外活动与社会贡献\n（配置 AI_GATEWAY_API_KEY 后生成定制建议）`,
      RECOMMENDATION: `一、推荐人与申请人关系说明\n二、学术能力评价（具体事例）\n三、个人品质与潜力\n四、综合推荐意见\n（配置 AI_GATEWAY_API_KEY 后生成定制框架）`,
    };
    return NextResponse.json({
      fallback: true,
      type: type || "PS",
      draft: templates[type || "PS"],
      note: "当前未配置 AI API Key，已返回标准模板。",
    });
  }

  return NextResponse.json({ fallback: false, type: type || "PS", draft: ai.content });
}
