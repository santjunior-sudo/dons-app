import { NextResponse } from "next/server";
import { createSession, listQuizzes } from "@/lib/gameStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let quizId: string | undefined;
  try {
    const body = await req.json();
    quizId = body?.quizId;
  } catch {
    /* corpo vazio é aceitável */
  }
  const session = createSession(quizId);
  return NextResponse.json({ code: session.code, quizId: session.quiz.id });
}

export async function GET() {
  return NextResponse.json({
    quizzes: listQuizzes().map((q) => ({
      id: q.id,
      title: q.title,
      questions: q.questions.length,
    })),
  });
}
