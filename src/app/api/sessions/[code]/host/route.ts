import { NextResponse } from "next/server";
import {
  addBots,
  advance,
  getSession,
  resetSession,
  setAutoAdvance,
  snapshotFor,
  startGame,
} from "@/lib/gameStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const session = getSession(code);
  if (!session) {
    return NextResponse.json({ error: "Sala não encontrada." }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const action: string = body?.action ?? "";

  switch (action) {
    case "start":
      startGame(session.code);
      break;
    case "next":
      advance(session.code);
      break;
    case "auto":
      setAutoAdvance(session.code, !!body?.value);
      break;
    case "reset":
      resetSession(session.code);
      break;
    case "bots":
      addBots(session.code, Math.max(1, Math.min(60, Number(body?.count) || 10)));
      break;
    default:
      return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, snapshot: snapshotFor(session, null) });
}
