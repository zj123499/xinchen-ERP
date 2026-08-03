export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return NextResponse.json({ id: (await params).id });
}
export async function PUT(request: NextRequest) { return NextResponse.json({}); }
export async function DELETE(request: NextRequest) { return NextResponse.json({ ok: true }); }
