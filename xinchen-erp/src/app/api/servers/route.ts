export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";
import { encrypt } from "@/lib/crypto";


export async function GET(request: NextRequest) {
    const _denied = await requirePermission(request, "servers:view");
  if (_denied) return _denied;

const { tenantId } = getServerContext(request);
  const list = await prisma.server.findMany({
    where: { tenantId, status: true },
    orderBy: { createdAt: "desc" },
    // 排除密码字段，不通过 API 返回
    select: {
      id: true, name: true, address: true, account: true,
      description: true, expiresAt: true, status: true,
      createdAt: true, updatedAt: true, tenantId: true,
    },
  });
  const total = await prisma.server.count({ where: { tenantId, status: true } });
  return NextResponse.json({ list, total });
}

export async function POST(request: NextRequest) {
    const _denied = await requirePermission(request, "servers:create");
  if (_denied) return _denied;

const { tenantId } = getServerContext(request);
  const body = await request.json();
  const { name, address, account, password, description, expiresAt } = body;
  if (!name || !address) return NextResponse.json({ error: "名称和地址为必填项" }, { status: 400 });
  const s = await prisma.server.create({
    data: {
      tenantId, name, address,
      account: account || null,
      password: password ? encrypt(password) : null,
      description: description || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });
  // 不返回密码原文
  const { password: _, ...result } = s;
  return NextResponse.json(result, { status: 201 });
}