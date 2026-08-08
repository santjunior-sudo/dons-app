"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Stage, Wordmark } from "@/components/ui";
import type { Question, Quiz } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D"];

export default function AdminPage() {
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    fetch("/api/quizzes?id=dons-corpo-em-acao")
      .then((r) => r.json())
      .then((q: Quiz) => setQuiz(q))
      .catch(() => setStatus("Não foi possível carregar o quiz."));
  }, []);

  function patch(index: number, changes: Partial<Question>) {
    setQuiz((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q, i) => (i === index ? { ...q, ...changes } : q)),
          }
        : prev,
    );
  }

  function patchOption(index: number, optionId: string, label: string) {
    setQuiz((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q, i) =>
              i === index
                ? { ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, label } : o)) }
                : q,
            ),
          }
        : prev,
    );
  }

  function addQuestion() {
    setQuiz((prev) => {
      if (!prev) return prev;
      const n = prev.questions.length + 1;
      const question: Question = {
        id: `q${n}-${Math.random().toString(36).slice(2, 6)}`,
        act: 1,
        kind: "standard",
        title: `Desafio ${n}`,
        prompt: "",
        options: LETTERS.map((id) => ({ id, label: "" })),
        correctId: "A",
        explanation: "",
        reference: "",
        timeLimitSec: 25,
        basePoints: 1000,
        speedBonus: 300,
        dimensions: ["conhecimento"],
      };
      setOpenIndex(prev.questions.length);
      return { ...prev, questions: [...prev.questions, question] };
    });
  }

  function removeQuestion(index: number) {
    setQuiz((prev) =>
      prev ? { ...prev, questions: prev.questions.filter((_, i) => i !== index) } : prev,
    );
  }

  function move(index: number, dir: -1 | 1) {
    setQuiz((prev) => {
      if (!prev) return prev;
      const target = index + dir;
      if (target < 0 || target >= prev.questions.length) return prev;
      const questions = [...prev.questions];
      [questions[index], questions[target]] = [questions[target], questions[index]];
      return { ...prev, questions };
    });
    setOpenIndex(index + dir);
  }

  async function save(startRoom: boolean) {
    if (!quiz) return;
    setStatus("Salvando...");
    const payload: Quiz = { ...quiz, id: "custom", title: quiz.title || "Quiz personalizado" };
    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Falha ao salvar.");
      return;
    }
    setStatus(`Salvo como "custom" com ${data.questions} perguntas.`);
    if (startRoom) {
      const s = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: "custom" }),
      }).then((r) => r.json());
      router.push(`/host/${s.code}`);
    }
  }

  if (!quiz) {
    return (
      <Stage act={0}>
        <main className="grid min-h-dvh place-items-center">
          <p className="pulse-soft text-white/60">{status ?? "Carregando perguntas..."}</p>
        </main>
      </Stage>
    );
  }

  return (
    <Stage act={0}>
      <main className="mx-auto w-full max-w-4xl px-5 py-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/">
            <Wordmark size="text-2xl" />
          </Link>
          <span className="chip">Editor de perguntas</span>
        </div>

        <h1 className="display mt-6 text-4xl">Perguntas</h1>
        <p className="mt-2 text-white/65">
          Edite os desafios e salve como quiz personalizado. O quiz DONS original permanece intacto.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            className="input max-w-sm !py-3 !text-base"
            value={quiz.title}
            onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
            aria-label="Título do quiz"
          />
          <button className="btn btn-ghost text-sm" onClick={addQuestion}>
            + Pergunta
          </button>
          <button className="btn btn-ghost text-sm" onClick={() => save(false)}>
            Salvar
          </button>
          <button className="btn btn-primary text-sm" onClick={() => save(true)}>
            Salvar e criar sala
          </button>
          {status && <span className="text-sm font-bold text-amber-200">{status}</span>}
        </div>

        <div className="mt-6 flex flex-col gap-3 pb-16">
          {quiz.questions.map((q, i) => {
            const open = openIndex === i;
            return (
              <div key={q.id} className="glass rounded-2xl">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    className="flex flex-1 items-center gap-3 text-left"
                    onClick={() => setOpenIndex(open ? null : i)}
                    aria-expanded={open}
                  >
                    <span className="tabular display w-7 text-white/40">{i + 1}</span>
                    <span className="flex-1 truncate font-bold">{q.title || "(sem título)"}</span>
                    <span className="chip">{q.reference || "—"}</span>
                  </button>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => move(i, -1)} aria-label="Mover para cima">
                      ↑
                    </button>
                    <button className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => move(i, 1)} aria-label="Mover para baixo">
                      ↓
                    </button>
                    <button
                      className="btn btn-ghost !px-3 !py-1.5 text-xs text-rose-200"
                      onClick={() => removeQuestion(i)}
                      aria-label="Remover pergunta"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4">
                    <Field label="Título">
                      <input className="input !py-2.5 !text-base" value={q.title} onChange={(e) => patch(i, { title: e.target.value })} />
                    </Field>
                    <Field label="Pergunta">
                      <textarea
                        className="input !py-2.5 !text-base"
                        rows={2}
                        value={q.prompt}
                        onChange={(e) => patch(i, { prompt: e.target.value })}
                      />
                    </Field>

                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-white/50">
                        Alternativas (marque a correta)
                      </span>
                      {q.options.map((o) => (
                        <label key={o.id} className="flex items-center gap-3">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctId === o.id}
                            onChange={() => patch(i, { correctId: o.id })}
                            className="h-4 w-4 accent-emerald-400"
                            aria-label={`Marcar ${o.id} como correta`}
                          />
                          <span className="w-5 font-black">{o.id}</span>
                          <input
                            className="input !py-2 !text-base"
                            value={o.label}
                            onChange={(e) => patchOption(i, o.id, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>

                    <Field label="Explicação">
                      <textarea
                        className="input !py-2.5 !text-base"
                        rows={2}
                        value={q.explanation}
                        onChange={(e) => patch(i, { explanation: e.target.value })}
                      />
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-4">
                      <Field label="Referência">
                        <input className="input !py-2 !text-base" value={q.reference} onChange={(e) => patch(i, { reference: e.target.value })} />
                      </Field>
                      <Field label="Tempo (s)">
                        <input
                          type="number"
                          className="input !py-2 !text-base"
                          value={q.timeLimitSec}
                          onChange={(e) => patch(i, { timeLimitSec: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="Pontos base">
                        <input
                          type="number"
                          className="input !py-2 !text-base"
                          value={q.basePoints}
                          onChange={(e) => patch(i, { basePoints: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="Bônus velocidade">
                        <input
                          type="number"
                          className="input !py-2 !text-base"
                          value={q.speedBonus}
                          onChange={(e) => patch(i, { speedBonus: Number(e.target.value) })}
                        />
                      </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Ato">
                        <select
                          className="input !py-2 !text-base"
                          value={q.act}
                          onChange={(e) => patch(i, { act: Number(e.target.value) as Question["act"] })}
                        >
                          {[1, 2, 3, 4].map((a) => (
                            <option key={a} value={a} className="bg-slate-900">
                              Ato {a}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Tipo">
                        <select
                          className="input !py-2 !text-base"
                          value={q.kind}
                          onChange={(e) => patch(i, { kind: e.target.value as Question["kind"] })}
                        >
                          <option value="standard" className="bg-slate-900">Padrão</option>
                          <option value="boss" className="bg-slate-900">Boss</option>
                          <option value="final" className="bg-slate-900">Final</option>
                        </select>
                      </Field>
                      <Field label="Ranking depois">
                        <select
                          className="input !py-2 !text-base"
                          value={q.leaderboardAfter ? "sim" : "nao"}
                          onChange={(e) => patch(i, { leaderboardAfter: e.target.value === "sim" })}
                        >
                          <option value="nao" className="bg-slate-900">Não</option>
                          <option value="sim" className="bg-slate-900">Sim</option>
                        </select>
                      </Field>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </Stage>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-white/50">{label}</span>
      {children}
    </label>
  );
}
