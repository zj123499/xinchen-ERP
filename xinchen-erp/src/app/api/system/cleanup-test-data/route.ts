import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permission";

export async function POST(request: NextRequest) {
  const roleStr = request.headers.get("x-user-roles") || "";
  if (!isAdmin(roleStr.split(",").filter(Boolean))) {
    return NextResponse.json({ error: "仅管理员" }, { status: 403 });
  }

  const result: string[] = [];
  const tables = ["followUp", "visa", "offer", "applicationMaterial", "application", "payment", "refund", "invoice", "copywriterTask", "order", "contract", "lead", "rentalOrder", "overseasService", "visitRecord", "visitPlan", "successVisit", "file", "studentIntention", "student"];
  
  for (const name of tables) {
    try {
      const r = await (prisma as any)[name].deleteMany({});
      if (r.count > 0) result.push(`${name}: ${r.count}`);
    } catch {}
  }

  return NextResponse.json({ deleted: result, total: result.length });
}
