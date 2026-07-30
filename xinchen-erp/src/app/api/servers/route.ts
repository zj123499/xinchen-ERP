import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const list = await prisma.server.findMany({
    where: { tenantId, status: true },
    orderBy: { createdAt: "desc" },
  });
  const total = await prisma.server.count({ where: { tenantId, status: true } });
  return NextResponse.json({ list, total });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { name, address, account, password, description, expiresAt } = body;
  if (!name || !address) return NextResponse.json({ error: "名称和地址为必填项" }, { status: 400 });
  const s = await prisma.server.create({
    data: {
      tenantId, name, address,
      account: account || null,
      password: password || null,
      description: description || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });
  return NextResponse.json(s, { status: 201 });
}