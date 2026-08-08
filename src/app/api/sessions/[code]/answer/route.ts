import { NextResponse } from "next/server";
import { getSession, snapshotFor, submitAnswer } from "@/lib/gameStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = await req.json().catch(() => ({}));
  const playerId: string = body?.playerId ?? "";
  const result = submitAnswer(code, playerId, body?.optionId ?? "");
  const session = getSession(code);
  if ("error" in result) {
    return NextResponse.json(
      {
        error: result.error,
        snapshot: session ? snapshotFor(session, playerId) : null,
      },
      { status: 400 },
    );
  }
  return NextResponse.json({
    ok: true,
    snapshot: session ? snapshotFor(session, playerId) : null,
  });
}
