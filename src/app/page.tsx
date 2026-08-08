"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Stage, Wordmark } from "@/components/ui";
import { CHURCH_NAME, EVENT_SUBTITLE } from "@/lib/branding";

interface QuizCard {
  id: string;
  title: string;
  subtitle: string;
  passage: string;
  tagline: string;
  questions: number;
}

export default function Home() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizCard[]>([]);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/quizzes")
      .then((r) => r.json())
      .then((d) => setQuizzes(d.quizzes ?? []))
      .catch(() => setQuizzes([]));
  }, []);

  async function createRoom(quizId: string) {
    setCreating(quizId);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId }),
      });
      const data = await res.json();
      router.push(`/host/${data.code}`);
    } catch {
      setCreating(null);
    }
  }

  return (
    <Stage act={0}>
      <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col items-center justify-center gap-10 px-6 py-14 text-center">
        <div className="rise flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <p className="display text-lg md:text-2xl text-amber-200">{CHURCH_NAME}</p>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">
              {EVENT_SUBTITLE}
            </p>
          </div>
          <Wordmark size="text-5xl md:text-7xl" label="EXPERIÊNCIAS" />
          <p className="max-w-xl text-balance text-white/65">
            Experiências bíblicas interativas: você projeta o telão, a turma entra pelo celular
            escaneando o QR Code.
          </p>
        </div>

        <div className="rise grid w-full gap-4 md:grid-cols-2" style={{ animationDelay: "140ms" }}>
          {quizzes.length === 0 && (
            <p className="pulse-soft col-span-full text-white/45">Carregando experiências...</p>
          )}
          {quizzes.map((q) => (
            <div
              key={q.id}
              className="glass flex flex-col gap-3 rounded-3xl p-6 text-left"
            >
              <span className="chip self-start">{q.passage}</span>
              <div>
                <h2 className="display text-3xl leading-tight">{q.title}</h2>
                <p className="text-white/70">{q.subtitle}</p>
              </div>
              <p className="flex-1 text-sm text-white/55">{q.tagline}</p>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/40">
                {q.questions} desafios · 8 a 10 minutos
              </p>
              <button
                className="btn btn-primary"
                onClick={() => createRoom(q.id)}
                disabled={creating !== null}
              >
                {creating === q.id ? "Criando sala..." : "CRIAR DESAFIO"}
              </button>
            </div>
          ))}
        </div>

        <div className="rise flex flex-col items-center gap-3" style={{ animationDelay: "260ms" }}>
          <p className="text-sm text-white/55">
            Os alunos entram escaneando o QR Code do telão — sem código, sem cadastro.
          </p>
          <div className="flex justify-center gap-4 text-xs font-semibold uppercase tracking-widest text-white/45">
            <Link href="/host/demo" className="hover:text-white">
              Modo demo
            </Link>
            <Link href="/admin" className="hover:text-white">
              Perguntas
            </Link>
          </div>
        </div>
      </main>
    </Stage>
  );
}
