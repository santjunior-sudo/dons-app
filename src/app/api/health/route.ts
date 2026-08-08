import { NextResponse } from "next/server";
import { listQuizzes } from "@/lib/gameStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Usado pelo health check da plataforma e pelo preflight antes da aula. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    uptimeSec: Math.round(process.uptime()),
    quizzes: listQuizzes().length,
    now: new Date().toISOString(),
  });
}
