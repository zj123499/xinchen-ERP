/**
 * 风险扫描 API（风险管理中心）
 * POST /api/risk-scan - 执行风险规则引擎扫描，自动生成风险记录
 *
 * 内置规则：
 *  1. 距离入学 < 7天 且 材料完成率 < 80% → 高风险
 *  2. 签证递交 > 30天 且无结果 → 中风险
 *  3. 合同签约 > 15天 且 收款不足合同金额 → 中风险
 *  4. 投诉 > 2次 → 高风险
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, RiskLevel } from "@prisma/client";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const now = new Date();

  const created: { rule: string; studentId: number | null; level: string; detail: string }[] = [];

  // 规则1：材料完成率 < 80% 且 7 天内有入学截止
  const apps = await prisma.application.findMany({
    where: { tenantId },
    include: { materials: true, student: { select: { id: true, name: true } } },
  });
  for (const app of apps) {
    const total = app.materials.length;
    const done = app.materials.filter((m) => m.status === "verified" || m.status === "approved").length;
    const completion = total > 0 ? done / total : 1;
    const deadline = new Date(app.intakeYear, app.intakeMonth - 1, 1);
    const daysToDeadline = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
    if (completion < 0.8 && daysToDeadline < 7 && daysToDeadline > -30) {
      created.push({
        rule: "材料进度滞后",
        studentId: app.student.id,
        level: "HIGH",
        detail: `材料完成率 ${(completion * 100).toFixed(0)}%，距入学 ${daysToDeadline} 天（${app.student.name}）`,
      });
    }
  }

  // 规则2：签证递交 > 30天 且无结果
  const visas = await prisma.visa.findMany({
    where: { status: "SUBMITTED", submittedAt: { lt: new Date(now.getTime() - 30 * 86400000) } },
    include: { application: { include: { student: { select: { id: true, name: true } } } } },
  });
  for (const v of visas) {
    if (v.application.tenantId !== tenantId) continue;
    created.push({
      rule: "签证长时间未出签",
      studentId: v.application.student.id,
      level: "MEDIUM",
      detail: `签证（${v.visaType}）已递交超过 30 天仍未出签（${v.application.student.name}）`,
    });
  }

  // 规则3：付款逾期 > 15天（签约>15天且学生收款不足合同金额）
  const overdueContracts = await prisma.contract.findMany({
    where: { tenantId, status: { in: ["SIGNED", "APPROVED"] }, signDate: { lt: new Date(now.getTime() - 15 * 86400000) } },
    include: { student: { select: { id: true, name: true } } },
  });
  for (const c of overdueContracts) {
    const paidAgg = await prisma.payment.aggregate({
      where: { tenantId, studentId: c.studentId },
      _sum: { amount: true },
    });
    const paid = Number(paidAgg._sum.amount || 0);
    if (paid < Number(c.totalAmount)) {
      created.push({
        rule: "付款逾期",
        studentId: c.student.id,
        level: "MEDIUM",
        detail: `合同金额 ¥${Number(c.totalAmount).toFixed(2)}，该生累计收款 ¥${paid.toFixed(2)}（${c.student.name}）`,
      });
    }
  }

  // 规则4：投诉 > 2次
  const complaintGroups = await prisma.complaint.groupBy({
    by: ["studentId"],
    where: { tenantId },
    _count: { _all: true },
    having: { studentId: { _count: { gt: 2 } } },
  });
  for (const g of complaintGroups) {
    if (!g.studentId) continue;
    const stu = await prisma.student.findFirst({ where: { id: g.studentId }, select: { name: true } });
    created.push({
      rule: "多次投诉",
      studentId: g.studentId,
      level: "HIGH",
      detail: `该学生累计投诉 ${g._count._all} 次（${stu?.name || g.studentId}）`,
    });
  }

  // 写入风险记录（去重：同一学生同一规则名不重复）
  let inserted = 0;
  for (const item of created) {
    let ruleEntity = await prisma.riskRule.findFirst({ where: { tenantId, name: item.rule } });
    if (!ruleEntity) {
      ruleEntity = await prisma.riskRule.create({
        data: { tenantId, name: item.rule, conditionExpr: item.rule, riskLevel: item.level as RiskLevel, enabled: true },
      });
    }
    const dup = await prisma.riskRecord.findFirst({
      where: { tenantId, ruleId: ruleEntity.id, studentId: item.studentId ?? 0, status: "OPEN" },
    });
    if (dup) continue;

    const rec = await prisma.riskRecord.create({
      data: {
        tenantId,
        ruleId: ruleEntity.id,
        studentId: item.studentId,
        riskLevel: item.level as RiskLevel,
        status: "OPEN",
        detail: item.detail,
      },
    });
    await prisma.riskNotification.create({
      data: {
        tenantId,
        riskRecordId: rec.id,
        studentId: item.studentId,
        channel: "SYSTEM",
        content: `风险预警【${item.level}】：${item.rule} - ${item.detail}`,
      },
    }).catch(() => {});
    inserted++;
  }

  return NextResponse.json({ scanned: created.length, inserted, message: `扫描完成，新增 ${inserted} 条风险记录` });
}
