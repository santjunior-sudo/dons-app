import { NextResponse } from "next/server";
import { getQuiz, listQuizzes, saveQuiz } from "@/lib/gameStore";
import donsQuiz from "@/data/donsQuiz";
import type { Question, Quiz } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const quiz = getQuiz(id);
    if (!quiz) return NextResponse.json({ error: "Quiz não encontrado." }, { status: 404 });
    return NextResponse.json(quiz);
  }
  return NextResponse.json({
    quizzes: listQuizzes().map((q) => ({
      id: q.id,
      title: q.title,
      subtitle: q.subtitle,
      passage: q.passage,
      tagline: q.tagline,
      questions: q.questions.length,
    })),
  });
}

/** Salva um quiz na memória do servidor (editor simples do professor). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Partial<Quiz> | null;
  if (!body?.id || !Array.isArray(body.questions) || body.questions.length === 0) {
    return NextResponse.json(
      { error: "Informe um id e ao menos uma pergunta." },
      { status: 400 },
    );
  }

  let questions: Question[];
  try {
    questions = body.questions.map((q, i) => {
      const options = (q.options ?? []).filter((o) => o?.id && o?.label);
      if (options.length < 2) throw_(`A pergunta ${i + 1} precisa de ao menos 2 alternativas.`);
      if (!options.some((o) => o.id === q.correctId)) {
        throw_(`A pergunta ${i + 1} precisa de uma alternativa correta válida.`);
      }
      return {
        id: q.id || `q${i + 1}`,
        act: q.act ?? 1,
        kind: q.kind ?? "standard",
        title: q.title || `Desafio ${i + 1}`,
        prompt: q.prompt || "",
        options,
        correctId: q.correctId!,
        explanation: q.explanation ?? "",
        reference: q.reference ?? "",
        timeLimitSec: Math.max(5, Math.min(180, Number(q.timeLimitSec) || 25)),
        basePoints: Math.max(0, Number(q.basePoints) || 1000),
        speedBonus: Math.max(0, Number(q.speedBonus) || 300),
        dimensions: q.dimensions?.length ? q.dimensions : ["conhecimento"],
        scene: q.scene,
        headline: q.headline,
        setup: q.setup,
        leaderboardAfter: q.leaderboardAfter,
      };
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Quiz inválido." },
      { status: 400 },
    );
  }

  const base = (body.id && getQuiz(body.id)) || donsQuiz;
  const quiz: Quiz = {
    id: body.id,
    title: body.title || "Quiz sem título",
    subtitle: body.subtitle ?? base.subtitle,
    tagline: body.tagline ?? base.tagline,
    passage: body.passage ?? base.passage,
    acts: body.acts?.length ? body.acts : base.acts,
    meter: body.meter ?? base.meter,
    finale: body.finale ?? base.finale,
    questions,
  };

  saveQuiz(quiz);
  return NextResponse.json({ ok: true, id: quiz.id, questions: quiz.questions.length });
}

function throw_(message: string): never {
  throw new Error(message);
}
