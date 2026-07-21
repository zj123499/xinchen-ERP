import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ChannelType, AttributionModel } from "@prisma/client";

function getContext(request: NextRequest) {
  return { tenantId: parseInt(request.headers.get("x-tenant-id") || "0") };
}

const CHANNEL_LABELS: Record<string, string> = {
  SEARCH: "搜索引擎",
  SOCIAL: "社交媒体",
  AD: "广告投放",
  REFERRAL: "转介绍",
  EVENT: "线下活动",
  WEBSITE: "官网",
  OTHER: "其他",
};

// GET /api/channels/roi  各渠道 ROI 报表
export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const model = (searchParams.get("model") || "LAST_TOUCH") as AttributionModel;

  const attributions = await prisma.attribution.findMany({
    where: { tenantId, model },
    include: { touchpoint: { select: { channel: true } } },
  });
  const touchpoints = await prisma.touchpoint.findMany({
    where: { tenantId },
    select: { channel: true, studentId: true },
  });

  const signByChannel = new Map<ChannelType, number>();
  const signStudentsByChannel = new Map<ChannelType, Set<number>>();
  for (const a of attributions) {
    const ch = a.touchpoint.channel;
    const amt = Number(a.attributedAmount) || 0;
    signByChannel.set(ch, (signByChannel.get(ch) || 0) + amt);
    if (amt > 0) {
      const set = signStudentsByChannel.get(ch) || new Set<number>();
      set.add(a.studentId);
      signStudentsByChannel.set(ch, set);
    }
  }

  const touchCountByChannel = new Map<ChannelType, number>();
  const reachByChannel = new Map<ChannelType, Set<number>>();
  for (const t of touchpoints) {
    touchCountByChannel.set(t.channel, (touchCountByChannel.get(t.channel) || 0) + 1);
    const set = reachByChannel.get(t.channel) || new Set<number>();
    set.add(t.studentId);
    reachByChannel.set(t.channel, set);
  }

  const rows = Object.values(ChannelType).map((ch) => {
    const signAmount = Math.round((signByChannel.get(ch) || 0) * 100) / 100;
    const marketingCost = 0; // 暂无渠道营销成本数据，待接入成本模块后计算真实 ROI
    return {
      channel: ch,
      channelLabel: CHANNEL_LABELS[ch] || ch,
      touchCount: touchCountByChannel.get(ch) || 0,
      reachStudents: reachByChannel.get(ch)?.size || 0,
      signStudents: signStudentsByChannel.get(ch)?.size || 0,
      signAmount,
      marketingCost,
      roi: null,
    };
  });

  const totalReach = new Set(touchpoints.map((t) => t.studentId)).size;
  const totalSign = new Set(
    attributions.filter((a) => (Number(a.attributedAmount) || 0) > 0).map((a) => a.studentId)
  ).size;
  const totalSignAmount = Array.from(signByChannel.values()).reduce((a, b) => a + b, 0);

  const summary = {
    totalTouch: touchpoints.length,
    totalReach,
    totalSign,
    totalSignAmount: Math.round(totalSignAmount * 100) / 100,
    totalCost: 0,
  };

  return NextResponse.json({ model, summary, rows });
}
