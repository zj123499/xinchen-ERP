import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AttributionModel } from "@prisma/client";

function getContext(request: NextRequest) {
  return { tenantId: parseInt(request.headers.get("x-tenant-id") || "0") };
}

const VALID_MODELS: AttributionModel[] = ["FIRST_TOUCH", "LAST_TOUCH", "LINEAR", "TIME_DECAY"];

// POST /api/attribution/run  按模型重跑获客归因
export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json().catch(() => ({}) as any);
  let model: AttributionModel = "LAST_TOUCH";
  if (body?.model && VALID_MODELS.includes(body.model)) model = body.model;

  // 1. 拉取租户内全部触点，按学生分组
  const touchpoints = await prisma.touchpoint.findMany({
    where: { tenantId },
    orderBy: { occurredAt: "asc" },
  });

  // 2. 拉取租户内合同，按学生聚合签约额
  const contracts = await prisma.contract.findMany({
    where: { tenantId },
    select: { studentId: true, totalAmount: true },
  });
  const signAmountByStudent = new Map<number, number>();
  for (const c of contracts) {
    const amt = Number(c.totalAmount) || 0;
    signAmountByStudent.set(c.studentId, (signAmountByStudent.get(c.studentId) || 0) + amt);
  }

  // 3. 按模型计算各触点权重
  const byStudent = new Map<number, typeof touchpoints>();
  for (const tp of touchpoints) {
    const arr = byStudent.get(tp.studentId) || [];
    arr.push(tp);
    byStudent.set(tp.studentId, arr);
  }

  const records: {
    tenantId: number;
    studentId: number;
    touchpointId: number;
    model: AttributionModel;
    weight: number;
    attributedAmount: number | null;
    runBatch: string;
  }[] = [];
  const runBatch = `run_${tenantId}_${Date.now()}`;

  for (const [studentId, tps] of byStudent.entries()) {
    const n = tps.length;
    const signAmount = signAmountByStudent.get(studentId) || 0;
    const weights = computeWeights(model, tps);
    tps.forEach((tp, idx) => {
      records.push({
        tenantId,
        studentId,
        touchpointId: tp.id,
        model,
        weight: weights[idx],
        attributedAmount: signAmount > 0 ? Math.round(signAmount * weights[idx] * 100) / 100 : null,
        runBatch,
      });
    });
  }

  // 4. 先删除该模型旧数据，再批量写入
  await prisma.attribution.deleteMany({ where: { tenantId, model } });
  if (records.length > 0) {
    await prisma.attribution.createMany({ data: records });
  }

  return NextResponse.json({
    message: `归因重跑完成（${model}），共生成 ${records.length} 条记录`,
  });
}

function computeWeights(model: AttributionModel, tps: { occurredAt: Date }[]): number[] {
  const n = tps.length;
  if (n === 0) return [];
  const w = new Array(n).fill(0);
  switch (model) {
    case "FIRST_TOUCH":
      w[0] = 1;
      break;
    case "LAST_TOUCH":
      w[n - 1] = 1;
      break;
    case "LINEAR":
      w.fill(1 / n);
      break;
    case "TIME_DECAY": {
      const now = Date.now();
      const scores = tps.map(
        (t) => 1 / (1 + (now - new Date(t.occurredAt).getTime()) / (1000 * 3600 * 24 * 7))
      );
      const sum = scores.reduce((a, b) => a + b, 0) || 1;
      for (let i = 0; i < n; i++) w[i] = scores[i] / sum;
      break;
    }
    default:
      w[n - 1] = 1;
  }
  return w;
}
