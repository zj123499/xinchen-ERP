import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApprovalNodeType } from "@prisma/client";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

const DEFAULT_FLOWS = [
  { businessType: "CONTRACT_DISCOUNT", name: "合同优惠审批", description: "合同优惠比例变更审批", nodeName: "优惠审批" },
  { businessType: "REFUND", name: "退款审批", description: "退款申请审批", nodeName: "退款审批" },
  { businessType: "REIMBURSEMENT", name: "报销审批", description: "费用报销审批", nodeName: "报销审批" },
  { businessType: "LEAD_TRANSFER", name: "线索划转审批", description: "线索划转审批", nodeName: "划转审批" },
];

// POST /api/approval-flows/init-defaults  初始化四类业务默认审批流
export async function POST(request: NextRequest) {
  const { userId, tenantId } = getContext(request);
  let created = 0;
  for (const f of DEFAULT_FLOWS) {
    const existing = await prisma.approvalFlow.findFirst({
      where: { tenantId, businessType: f.businessType },
    });
    if (existing) continue;
    await prisma.approvalFlow.create({
      data: {
        tenantId,
        name: f.name,
        businessType: f.businessType,
        description: f.description,
        signMode: "AND",
        enabled: true,
        nodes: {
          create: [
            {
              nodeType: "APPROVE" as ApprovalNodeType,
              orderNo: 1,
              name: f.nodeName,
              approverId: userId || null,
              approverRole: "ADMIN",
            },
          ],
        },
      },
    });
    created++;
  }
  return NextResponse.json({
    message: created > 0 ? `已初始化 ${created} 条默认审批流` : "默认审批流已存在",
    created,
  });
}
