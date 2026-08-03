export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function GET(request: NextRequest) {

const _denied = await requirePermission(request, "leads:view");

if (_denied) return _denied;


  const { tenantId } = getServerContext(request);
  const { searchParams } = new URL(request.url);
  const model = searchParams.get("model") || "";
  const studentId = searchParams.get("studentId") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

  const where: Record<string, unknown> = { tenantId };
  if (model) where.model = model;
  if (studentId) where.studentId = parseInt(studentId);

  const [total, list] = await Promise.all([
    prisma.attribution.count({ where }),
    prisma.attribution.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { id: true, name: true } },
        touchpoint: { select: { id: true, channel: true, source: true } },
      },
    }),
  ]);

  // Attribution 无 contract 关系（仅 contractId 字段），按 contractId 手动补齐展示
  const contractIds = Array.from(
    new Set(list.map((a) => a.contractId).filter((x): x is number => x != null))
  );
  const contractMap: Record<number, { id: number; contractNo: string | null; totalAmount: unknown }> = {};
  if (contractIds.length) {
    const contracts = await prisma.contract.findMany({
      where: { id: { in: contractIds }, tenantId },
      select: { id: true, contractNo: true, totalAmount: true },
    });
    for (const c of contracts) contractMap[c.id] = c;
  }
  const listWithContract = list.map((a) => ({
    ...a,
    contract: a.contractId ? contractMap[a.contractId] || null : null,
  }));

  return NextResponse.json({
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    list: listWithContract,
  });
}
