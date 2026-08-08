"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BodyMeter from "@/components/BodyMeter";
import { BossScene, Countdown, EyesScene, FinalScene } from "@/components/Scenes";
import { Reference, Stage, TimerRing, Wordmark } from "@/components/ui";
import { CHURCH_NAME, EVENT_SUBTITLE } from "@/lib/branding";
import { useGame, useRemaining } from "@/lib/useGame";
import type { DistributionRow, QuestionStats, Snapshot } from "@/lib/types";

export default function HostPage() {
  const params = useParams<{ code: string }>();
  const code = (params?.code ?? "").toUpperCase();
  const { snapshot, connected, error } = useGame(code, null);
  const remaining = useRemaining(snapshot?.endsAt ?? null, snapshot?.serverNow);
  const [origin, setOrigin] = useState("");
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  // Cada cena começa do topo, mesmo que a anterior tenha sido rolada.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [snapshot?.state, snapshot?.questionNumber]);

  const action = useCallback(
    async (body: Record<string, unknown>) => {
      await fetch(`/api/sessions/${code}/host`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    [code],
  );

  // Espaço / seta avançam a dinâmica — o professor não precisa mirar o mouse.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.code === "Space" || e.code === "ArrowRight" || e.code === "Enter") {
        e.preventDefault();
        action({ action: "next" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [action]);

  if (error && !snapshot) {
    return (
      <Stage act={0}>
        <main className="grid min-h-dvh place-items-center px-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <Wordmark />
            <p className="text-white/70">{error}</p>
            <Link href="/host" className="btn btn-primary">
              Criar nova sala
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

  const act = snapshot.act?.act ?? 0;
  const joinUrl = origin ? `${origin}/join/${snapshot.code}` : "";

  return (
    <Stage act={act} className="h-dvh overflow-hidden">
      <div className="flex h-dvh flex-col">
        <header className="flex items-center justify-between gap-4 px-6 py-4 md:px-10">
          <Wordmark size="text-2xl" />
          <div className="flex items-center gap-4">
            {snapshot.state !== "LOBBY" && (
              <div className="hidden items-center gap-3 md:flex">
                <BodyMeter progress={snapshot.bodyProgress} size={44} compact />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                    Corpo em construção
                  </p>
                  <p className="tabular display text-lg">{snapshot.bodyProgress}%</p>
                </div>
              </div>
            )}
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Sala</p>
              <p className="display text-xl tracking-[0.2em]">{snapshot.code}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Jogadores</p>
              <p className="tabular display text-xl">{snapshot.playerCount}</p>
            </div>
            <span
              className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400 pulse-soft"}`}
              title={connected ? "Realtime conectado" : "Reconectando"}
            />
          </div>
        </header>

        <main
          ref={mainRef}
          className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-4 md:px-10"
        >
          <HostBody snapshot={snapshot} remaining={remaining} joinUrl={joinUrl} />
        </main>

        <HostControls snapshot={snapshot} action={action} />
      </div>
    </Stage>
  );
}

/* ------------------------------------------------------------------ */

function HostBody({
  snapshot,
  remaining,
  joinUrl,
}: {
  snapshot: Snapshot;
  remaining: number;
  joinUrl: string;
}) {
  const q = snapshot.question;

  switch (snapshot.state) {
    case "LOBBY":
      return <Lobby snapshot={snapshot} joinUrl={joinUrl} />;

    case "COUNTDOWN":
      return <Countdown remainingMs={remaining} />;

    case "TRANSITION":
      return (
        <div className="grid flex-1 place-items-center text-center">
          <div>
            <span className="chip">{snapshot.act?.tag}</span>
            <h1 className="display rise mt-4 text-6xl md:text-9xl text-glow">{snapshot.act?.title}</h1>
            <p className="rise mt-4 text-xl md:text-3xl text-white/70" style={{ animationDelay: "200ms" }}>
              {snapshot.act?.subtitle}
            </p>
          </div>
        </div>
      );

    case "QUESTION_ACTIVE":
    case "QUESTION_LOCKED":
    case "REVEAL": {
      if (!q) return null;
      const revealed = snapshot.state === "REVEAL";
      const locked = snapshot.state === "QUESTION_LOCKED";
      return (
        <div className="flex flex-1 flex-col gap-5 py-2">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">
                  Desafio {q.index + 1}/{q.total}
                </span>
                {q.kind === "boss" && (
                  <span className="chip border-amber-300/60 bg-amber-300/20 text-amber-200">
                    ⚡ Boss Round
                  </span>
                )}
                {q.kind === "final" && (
                  <span className="chip border-amber-300/60 bg-amber-300/20 text-amber-200">
                    ★ Desafio final
                  </span>
                )}
                <span className="chip">{snapshot.act?.tag}</span>
              </div>
              <h1 className="display mt-3 text-3xl md:text-5xl leading-tight">{q.prompt}</h1>
            </div>

            <div className="flex flex-none flex-col items-center gap-2">
              {snapshot.state === "QUESTION_ACTIVE" ? (
                <TimerRing remainingMs={remaining} totalSec={q.timeLimitSec} size={104} />
              ) : (
                <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-white/10 text-center">
                  <span className="display text-sm leading-tight">
                    VOTAÇÃO
                    <br />
                    ENCERRADA
                  </span>
                </div>
              )}
              <p className="tabular text-sm font-bold text-white/70">
                {snapshot.answersReceived}/{snapshot.playerCount} respostas
              </p>
            </div>
          </div>

          {/* Cenas cinematográficas */}
          {q.scene === "eyes" && (
            <div className="py-1">
              <EyesScene revealed={revealed} />
            </div>
          )}
          {q.scene === "boss" && (
            <BossScene
              lines={q.setup ?? []}
              revealed={revealed}
              active={snapshot.state === "QUESTION_ACTIVE"}
            />
          )}
          {q.scene !== "boss" && q.setup && q.setup.length > 0 && (
            <div className="glass rounded-2xl px-5 py-4 text-lg text-white/85 md:text-xl">
              {q.setup.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}

          <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
            {q.options.map((o) => {
              const row = snapshot.distribution?.find((d) => d.optionId === o.id);
              const isCorrect = revealed && q.correctId === o.id;
              const missed = revealed && q.correctId !== o.id;
              return (
                <div
                  key={o.id}
                  className={`opt opt-${o.id} ${isCorrect ? "opt-correct" : ""} ${missed ? "opt-missed" : ""} relative overflow-hidden text-lg md:text-2xl`}
                >
                  {(locked || revealed) && row && (
                    <div
                      className="absolute inset-y-0 left-0 bg-white/12 transition-all duration-700"
                      style={{ width: `${row.pct}%` }}
                      aria-hidden
                    />
                  )}
                  <span className="opt-badge relative z-10 text-xl">{o.id}</span>
                  <span className="relative z-10 flex-1">{o.label}</span>
                  {(locked || revealed) && row && (
                    <span className="tabular relative z-10 text-base font-black text-white/85">
                      {row.pct}% <span className="text-white/45">({row.count})</span>
                    </span>
                  )}
                  {isCorrect && <span className="relative z-10 text-2xl">✓</span>}
                </div>
              );
            })}
          </div>

          {revealed && (
            <div className="rise glass flex flex-col gap-3 rounded-3xl p-5 md:flex-row md:items-center md:gap-6">
              <div className="flex-none text-center">
                <p className="tabular display text-4xl text-emerald-300">{snapshot.correctPct}%</p>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
                  acertaram
                </p>
              </div>
              <div className="flex-1">
                <p className="text-base md:text-lg leading-relaxed text-white/90">{q.explanation}</p>
                <div className="mt-2">
                  <Reference>{q.reference}</Reference>
                </div>
              </div>
            </div>
          )}

          {revealed && q.headline && !q.scene && (
            <p className="display rise text-center text-2xl md:text-4xl text-amber-300 text-glow">
              {q.headline}
            </p>
          )}
        </div>
      );
    }

    case "LEADERBOARD":
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <h1 className="display text-4xl md:text-6xl">Ranking parcial</h1>
          <div className="flex w-full max-w-3xl flex-col gap-3">
            {snapshot.leaderboard.slice(0, 5).map((row, i) => (
              <div
                key={row.id}
                className="rise glass flex items-center gap-5 rounded-2xl px-6 py-4"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <span className="tabular display w-12 text-3xl text-white/45">{row.rank}</span>
                <span className="flex-1 truncate text-2xl font-black">{row.name}</span>
                <span className="tabular display text-3xl text-amber-300">{row.score}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "FINAL":
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <FinalScene intensity={(snapshot.report?.averageAccuracy ?? 50) / 100} />
          <BodyMeter progress={100} size={130} compact celebrate />
        </div>
      );

    case "RESULTS":
      return <FinalPanel snapshot={snapshot} />;

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */

function Lobby({ snapshot, joinUrl }: { snapshot: Snapshot; joinUrl: string }) {
  return (
    <div className="grid flex-1 gap-8 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col justify-center gap-6">
        <div>
          <p className="display text-2xl md:text-4xl text-amber-200">{CHURCH_NAME}</p>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.22em] text-white/45">
            {EVENT_SUBTITLE}
          </p>
          <h1 className="display mt-4 text-5xl md:text-7xl text-glow">ENTRE NA EXPERIÊNCIA</h1>
          <p className="mt-3 text-xl text-white/70">
            Aponte a câmera do celular para o QR Code. Depois é só digitar seu nome.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="rounded-3xl bg-white p-3 shadow-2xl">
            {joinUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`/api/qr?data=${encodeURIComponent(joinUrl)}`}
                alt={`QR Code para entrar na sala ${snapshot.code}`}
                width={216}
                height={216}
                className="h-[216px] w-[216px]"
              />
            ) : (
              <div className="h-[216px] w-[216px] animate-pulse rounded-xl bg-slate-200" />
            )}
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/45">
              Sem QR Code? Digite no navegador
            </p>
            <p className="display glow-violet mt-2 break-all rounded-2xl bg-white/10 px-5 py-3 text-xl md:text-3xl">
              {joinUrl.replace(/^https?:\/\//, "")}
            </p>
            <p className="mt-3 text-sm font-bold tracking-[0.2em] text-white/45">
              SALA {snapshot.code}
            </p>
          </div>
        </div>

        <p className="max-w-xl text-white/60">
          {snapshot.quizTagline}
        </p>
      </div>

      <div className="glass flex flex-col rounded-3xl p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
            No desafio
          </p>
          <p className="tabular display text-3xl">{snapshot.playerCount}</p>
        </div>
        <div className="scroll-thin mt-4 flex flex-wrap content-start gap-2 overflow-y-auto" style={{ maxHeight: "46vh" }}>
          {snapshot.players.length === 0 && (
            <p className="pulse-soft w-full py-10 text-center text-white/45">
              Aguardando participantes...
            </p>
          )}
          {snapshot.players.map((p) => (
            <span
              key={p.id}
              className="pop-in rounded-full bg-white/12 px-4 py-2 text-sm font-bold ring-1 ring-white/15"
            >
              {p.name}
              {p.isBot && <span className="ml-1.5 text-[10px] text-white/45">BOT</span>}
            </span>
          ))}
        </div>
        {snapshot.players[0] && (
          <p className="mt-4 text-sm font-bold text-emerald-300">
            {snapshot.players[0].name} entrou no desafio.
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FinalPanel({ snapshot }: { snapshot: Snapshot }) {
  const report = snapshot.report;
  if (!report) return null;

  return (
    <div className="scroll-thin flex flex-1 flex-col gap-5 overflow-y-auto py-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="chip">Painel do professor</span>
          <h1 className="display mt-2 text-4xl md:text-6xl">Análise da turma</h1>
        </div>
        <div className="flex gap-3">
          <BigStat label="Participantes" value={report.players} />
          <BigStat label="Média de acertos" value={`${report.averageAccuracy}%`} />
          <BigStat label="Desafios" value={report.questions.length} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="glass rounded-3xl p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/50">
            Ranking final
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {snapshot.leaderboard.slice(0, snapshot.playerCount >= 10 ? 10 : 5).map((row) => (
              <div key={row.id} className="flex items-center gap-4 rounded-xl bg-white/6 px-4 py-2.5">
                <span className="tabular display w-8 text-xl text-white/45">{row.rank}</span>
                <span className="flex-1 truncate font-bold">{row.name}</span>
                <span className="tabular font-black text-amber-300">{row.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {report.easiest && <MiniStat title="Questão mais fácil" stats={report.easiest} tone="emerald" />}
          {report.hardest && <MiniStat title="Questão mais difícil" stats={report.hardest} tone="rose" />}
        </div>
      </div>

      <div className="glass rounded-3xl p-5">
        <p className="display text-2xl">Aqui estão os pontos que merecem nossa conversa.</p>
        <p className="mt-1 text-sm text-white/60">
          As três questões em que a turma mais se dividiu.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {report.divergences.map((s, i) => (
            <div key={s.id} className="rounded-2xl bg-white/6 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-black">
                  {i + 1}. {s.title}
                </p>
                <span className="tabular text-sm font-black text-emerald-300">{s.correctPct}%</span>
              </div>
              <p className="mt-1 text-sm text-white/70">{s.prompt}</p>
              <div className="mt-3 flex flex-col gap-1.5">
                {s.distribution.map((d) => (
                  <DistBar key={d.optionId} row={d} />
                ))}
              </div>
              <div className="mt-3">
                <Reference>{s.reference}</Reference>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="pb-2 text-center text-xs text-white/45">
        Os perfis individuais refletem apenas o desempenho nesta dinâmica — não são um teste para
        identificar dons espirituais.
      </p>
    </div>
  );
}

function DistBar({ row }: { row: DistributionRow }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-5 text-xs font-black ${row.correct ? "text-emerald-300" : "text-white/50"}`}>
        {row.optionId}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${row.correct ? "bg-emerald-400" : "bg-white/35"}`}
          style={{ width: `${row.pct}%` }}
        />
      </div>
      <span className="tabular w-10 text-right text-xs font-bold text-white/60">{row.pct}%</span>
    </div>
  );
}

function MiniStat({
  title,
  stats,
  tone,
}: {
  title: string;
  stats: QuestionStats;
  tone: "emerald" | "rose";
}) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/50">{title}</p>
        <span
          className={`tabular display text-2xl ${tone === "emerald" ? "text-emerald-300" : "text-rose-300"}`}
        >
          {stats.correctPct}%
        </span>
      </div>
      <p className="mt-2 font-black">{stats.title}</p>
      <p className="mt-1 text-sm text-white/70">{stats.prompt}</p>
      <div className="mt-2">
        <Reference>{stats.reference}</Reference>
      </div>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass rounded-2xl px-5 py-3 text-center">
      <p className="tabular display text-3xl">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const NEXT_LABEL: Record<Snapshot["state"], string> = {
  LOBBY: "INICIAR",
  COUNTDOWN: "PULAR",
  TRANSITION: "COMEÇAR ATO",
  QUESTION_ACTIVE: "ENCERRAR VOTAÇÃO",
  QUESTION_LOCKED: "REVELAR",
  REVEAL: "PRÓXIMA",
  LEADERBOARD: "PRÓXIMA",
  FINAL: "VER ANÁLISE",
  RESULTS: "NOVA PARTIDA",
};

function HostControls({
  snapshot,
  action,
}: {
  snapshot: Snapshot;
  action: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const isFinished = snapshot.state === "RESULTS";
  const progress = useMemo(
    () => (snapshot.questionNumber / snapshot.totalQuestions) * 100,
    [snapshot.questionNumber, snapshot.totalQuestions],
  );

  return (
    <footer className="glass sticky bottom-0 z-10 border-t border-white/10 px-6 py-3 md:px-10">
      <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-400 to-amber-300 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {snapshot.state === "LOBBY" && (
            <>
              <button className="btn btn-ghost text-sm" onClick={() => action({ action: "bots", count: 10 })}>
                + 10 bots
              </button>
              <button className="btn btn-ghost text-sm" onClick={() => action({ action: "bots", count: 25 })}>
                + 25 bots
              </button>
            </>
          )}
          <label className="flex cursor-pointer items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={snapshot.autoAdvance}
              onChange={(e) => action({ action: "auto", value: e.target.checked })}
              className="h-4 w-4 accent-violet-400"
            />
            Auto avançar
          </label>
          {confirmReset ? (
            <span className="flex items-center gap-2">
              <button
                className="btn btn-ghost text-sm !py-2"
                onClick={() => {
                  action({ action: "reset" });
                  setConfirmReset(false);
                }}
              >
                Confirmar reinício
              </button>
              <button className="btn btn-ghost text-sm !py-2" onClick={() => setConfirmReset(false)}>
                Cancelar
              </button>
            </span>
          ) : (
            <button className="btn btn-ghost text-sm !py-2" onClick={() => setConfirmReset(true)}>
              Reiniciar
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {snapshot.state !== "LOBBY" && snapshot.questionNumber > 0 && (
            <span className="tabular text-sm font-bold text-white/50">
              {snapshot.questionNumber}/{snapshot.totalQuestions}
            </span>
          )}
          <button
            className={`btn ${snapshot.state === "LOBBY" ? "btn-amber" : "btn-primary"} text-base`}
            onClick={() => action({ action: isFinished ? "reset" : "next" })}
          >
            {NEXT_LABEL[snapshot.state]} →
          </button>
        </div>
      </div>
    </footer>
  );
}
