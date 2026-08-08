import { NextResponse } from "next/server";
import { getSession, snapshotFor } from "@/lib/gameStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const session = getSession(code);
  if (!session) {
    return NextResponse.json({ error: "Sala não encontrada." }, { status: 404 });
  }
  const playerId = new URL(req.url).searchParams.get("playerId");
  return NextResponse.json(snapshotFor(session, playerId));
}
