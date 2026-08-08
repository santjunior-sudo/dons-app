"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Meter from "@/components/Meter";
import { Countdown } from "@/components/Scenes";
import { Reference, Stage, TimerRing, Wordmark } from "@/components/ui";
import { loadPlayer, playerFromCookie, savePlayer } from "@/lib/playerStorage";
import { useGame, useRemaining } from "@/lib/useGame";
import type { Dimension, Snapshot } from "@/lib/types";

const DIM_LABEL: Record<Dimension, string> = {
  conhecimento: "Conhecimento",
  corpo: "Corpo",
  edificacao: "Edificação",
};

export default function PlayPage() {
  const params = useParams<{ code: string }>();
  const code = (params?.code ?? "").toUpperCase();
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadPlayer(code) ?? playerFromCookie(code);
    if (!stored) {
      router.replace(`/join/${code}`);
      return;
    }
    savePlayer(code, stored);
    setPlayerId(stored.playerId);
    setChecked(true);
  }, [code, router]);

  const { snapshot, connected, error } = useGame(checked ? code : null, playerId);
  const remaining = useRemaining(snapshot?.endsAt ?? null, snapshot?.serverNow);

  const me = snapshot?.me ?? null;
  const question = snapshot?.question ?? null;
  const answered = me?.answerOptionId ?? pending;

  // Ao trocar de pergunta, limpa o "otimismo" local.
  useEffect(() => {
    setPending(null);
    setNotice(null);
  }, [question?.id, snapshot?.state]);

  const answer = useCallback(
    async (optionId: string) => {
      if (!playerId || answered) return;
      setPending(optionId);
      try {
        const res = await fetch(`/api/sessions/${code}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, optionId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setPending(null);
          setNotice(data.error ?? "Não deu tempo.");
        }
      } catch {
        setPending(null);
        setNotice("Falha de conexão.");
      }
    },
    [answered, code, playerId],
  );

  if (!checked) return null;

  if (error && !snapshot) {
    return (
      <Stage act={0}>
        <main className="grid min-h-dvh place-items-center px-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <Wordmark />
            <p className="text-white/70">{error}</p>
            <Link href="/join" className="btn btn-ghost">
              Voltar
            </Link>
          </div>
        </main>
      </Stage>
    );
  }

  if (!snapshot) {
    return (
      <Stage act={0}>
        <main className="grid min-h-dvh place-items-center">
          <p className="pulse-soft text-white/60">Conectando...</p>
        </main>
      </Stage>
    );
  }

  if (me === null) {
    return (
      <Stage act={0}>
        <main className="grid min-h-dvh place-items-center px-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <p className="text-white/75">Sua conexão com esta sala expirou.</p>
            <Link href={`/join/${code}`} className="btn btn-primary">
              Entrar novamente
            </Link>
          </div>
        </main>
      </Stage>
    );
  }

  const act = snapshot.act?.act ?? 0;

  return (
    <Stage act={act}>
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-8 pt-4">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{me.name}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/45">
              Sala {snapshot.code} {connected ? "" : "· reconectando"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="tabular display text-xl">{me.score}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">pontos</p>
            </div>
            <div className="text-right">
              <p className="tabular display text-xl">
                {me.rank}
                <span className="text-white/40">/{me.of}</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">lugar</p>
            </div>
          </div>
        </header>

        <div className="mt-4 flex-1">
          <PlayerBody
            snapshot={snapshot}
            remaining={remaining}
            answered={answered}
            onAnswer={answer}
            notice={notice}
          />
        </div>
      </main>
    </Stage>
  );
}

function PlayerBody({
  snapshot,
  remaining,
  answered,
  onAnswer,
  notice,
}: {
  snapshot: Snapshot;
  remaining: number;
  answered: string | null;
  onAnswer: (optionId: string) => void;
  notice: string | null;
}) {
  const me = snapshot.me!;
  const q = snapshot.question;

  switch (snapshot.state) {
    case "LOBBY":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
          <div className="pop-in flex flex-col items-center gap-3">
            <span className="chip">Você está dentro</span>
            <h1 className="display text-4xl">Prepare-se, {me.name}.</h1>
            <p className="max-w-sm text-white/65">
              Olhe para o telão. O desafio começa quando o professor iniciar.
            </p>
          </div>
          <div className="flex items-center gap-2 text-white/55">
            <span className="pulse-soft inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-sm font-bold">
              {snapshot.playerCount} {snapshot.playerCount === 1 ? "pessoa" : "pessoas"} na sala
            </span>
          </div>
          <Meter meter={snapshot.meter} progress={0} size={130} compact />
        </div>
      );

    case "COUNTDOWN":
      return <Countdown remainingMs={remaining} word={snapshot.quizTitle} />;

    case "TRANSITION":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <span className="chip">{snapshot.act?.tag}</span>
          <h1 className="display rise text-5xl text-glow">{snapshot.act?.title}</h1>
          <p className="rise max-w-sm text-white/70" style={{ animationDelay: "180ms" }}>
            {snapshot.act?.subtitle}
          </p>
        </div>
      );

    case "QUESTION_ACTIVE":
      if (!q) return null;
      return (
        <div className="flex h-full flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/45">
                Desafio {q.index + 1} de {q.total}
                {q.kind === "boss" && <span className="ml-2 text-amber-300">· BOSS ROUND</span>}
                {q.kind === "final" && <span className="ml-2 text-amber-300">· DESAFIO FINAL</span>}
              </p>
              <h1 className="display mt-1 text-2xl leading-tight">{q.title}</h1>
            </div>
            <TimerRing remainingMs={remaining} totalSec={q.timeLimitSec} size={64} />
          </div>

          {q.setup && q.setup.length > 0 && (
            <div className="glass rounded-2xl px-4 py-3 text-sm text-white/80">
              {q.setup.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}

          <p className="text-lg font-bold leading-snug">{q.prompt}</p>

          {answered ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <div className="pop-in grid h-24 w-24 place-items-center rounded-full bg-white/10">
                <span className="display text-4xl">{answered}</span>
              </div>
              <p className="display text-2xl">Resposta registrada</p>
              <p className="text-sm text-white/60">
                Aguarde a turma. Ninguém vê a correção antes do telão revelar.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {q.options.map((o) => (
                <button
                  key={o.id}
                  className={`opt opt-${o.id}`}
                  onClick={() => onAnswer(o.id)}
                  aria-label={`Alternativa ${o.id}: ${o.label}`}
                >
                  <span className="opt-badge">{o.id}</span>
                  <span>{o.label}</span>
                </button>
              ))}
            </div>
          )}

          {notice && (
            <p role="alert" className="rounded-xl bg-amber-400/15 px-4 py-2 text-center text-sm font-bold text-amber-200">
              {notice}
            </p>
          )}
        </div>
      );

    case "QUESTION_LOCKED":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <div className="pulse-soft display text-3xl">A turma decidiu.</div>
          <p className="text-white/60">Paulo responde no telão...</p>
        </div>
      );

    case "REVEAL": {
      if (!q) return null;
      const correct = me.lastCorrect;
      const noAnswer = me.answerOptionId === null;
      return (
        <div className="flex flex-col gap-4 pb-6">
          <div
            className={`pop-in rounded-3xl p-5 text-center ${
              correct
                ? "bg-emerald-400/20 ring-2 ring-emerald-300/60"
                : noAnswer
                  ? "bg-white/10 ring-1 ring-white/20"
                  : "bg-amber-400/15 ring-1 ring-amber-300/40"
            }`}
          >
            <p className="display text-3xl">
              {correct ? "✓ ACERTOU" : noAnswer ? "Sem resposta desta vez" : "Essa passou perto."}
            </p>
            {correct && (
              <p className="tabular mt-1 text-lg font-black text-emerald-200">
                +{me.lastPoints} pontos
              </p>
            )}
          </div>

          <div className="glass rounded-2xl p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/45">
              Resposta correta
            </p>
            <p className="mt-1 text-lg font-black">
              {q.correctId}. {q.options.find((o) => o.id === q.correctId)?.label}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/80">{q.explanation}</p>
            <div className="mt-3">
              <Reference>{q.reference}</Reference>
            </div>
          </div>

          {q.headline && (
            <p className="display rise text-balance text-center text-lg leading-tight text-amber-200">
              {q.headline}
            </p>
          )}

          <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
            <span className="text-sm font-bold text-white/60">Sua posição</span>
            <span className="tabular display text-xl">
              {me.rank}º <span className="text-white/40">de {me.of}</span>
            </span>
          </div>
        </div>
      );
    }

    case "LEADERBOARD": {
      const top = snapshot.leaderboard.slice(0, 5);
      return (
        <div className="flex h-full flex-col gap-4">
          <h1 className="display text-3xl">Ranking parcial</h1>
          <div className="flex flex-col gap-2">
            {top.map((row) => (
              <div
                key={row.id}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                  row.id === me.id ? "bg-white/20 ring-2 ring-white/60" : "bg-white/6"
                }`}
              >
                <span className="tabular display w-8 text-xl text-white/50">{row.rank}</span>
                <span className="flex-1 truncate font-bold">{row.name}</span>
                <span className="tabular font-black">{row.score}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto rounded-2xl bg-white/10 p-4 text-center">
            <p className="text-sm font-bold text-white/60">Você está em</p>
            <p className="tabular display text-4xl">{me.rank}º</p>
            <p className="tabular text-sm text-white/60">{me.score} pontos</p>
          </div>
        </div>
      );
    }

    case "FINAL":
      return (
        <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
          <Meter meter={snapshot.meter} progress={100} size={150} compact celebrate />
          <h1 className="display rise text-balance text-2xl text-glow">
            {snapshot.finale.beats[0]?.lines.join(" ")}
          </h1>
          <p className="rise text-white/70" style={{ animationDelay: "200ms" }}>
            Olhe para o telão.
          </p>
        </div>
      );

    case "RESULTS":
      return (
        <div className="flex h-full flex-col gap-4">
          <div className="pop-in rounded-3xl bg-gradient-to-br from-violet-500/30 to-sky-500/20 p-5 text-center ring-1 ring-white/20">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">
              Seu resultado
            </p>
            <h1 className="display mt-1 text-3xl text-glow">{me.profile?.name ?? "Participante"}</h1>
            <p className="mt-2 text-sm text-white/80">{me.profile?.description}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Pontos" value={me.score} />
            <Stat label="Acertos" value={`${me.correctCount}/${me.answeredCount}`} />
            <Stat label="Lugar" value={`${me.rank}º`} />
          </div>

          <div className="glass rounded-2xl p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/45">
              Suas dimensões
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {(Object.keys(me.dimensions) as Dimension[]).map((d) => (
                <div key={d}>
                  <div className="flex justify-between text-sm font-bold">
                    <span>{DIM_LABEL[d]}</span>
                    <span className="tabular text-white/60">{me.dimensions[d]}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-400 to-amber-300 transition-all duration-1000"
                      style={{ width: `${me.dimensions[d]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="rounded-2xl bg-white/5 p-4 text-center text-xs leading-relaxed text-white/60">
            Este resultado representa apenas seu desempenho nesta dinâmica e não é um teste para
            identificar seu dom espiritual.
          </p>
        </div>
      );

    default:
      return null;
  }
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/8 px-2 py-3">
      <p className="tabular display text-2xl">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">{label}</p>
    </div>
  );
}
