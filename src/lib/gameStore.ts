import donsQuiz from "@/data/donsQuiz";
import { readState, scheduleWrite } from "@/lib/persistence";
import type {
  ActInfo,
  Dimension,
  DistributionRow,
  FinalReport,
  GameState,
  LeaderboardRow,
  PlayerPublic,
  ProfileResult,
  PublicQuestion,
  Question,
  QuestionStats,
  Quiz,
  Snapshot,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Modelo em memória                                                    */
/* ------------------------------------------------------------------ */

interface AnswerRecord {
  playerId: string;
  optionId: string;
  at: number;
  correct: boolean;
  points: number;
}

interface Player {
  id: string;
  name: string;
  score: number;
  isBot: boolean;
  joinedAt: number;
  dims: Record<Dimension, { earned: number; possible: number }>;
  correctCount: number;
  answeredCount: number;
}

type Subscriber = {
  id: string;
  playerId: string | null;
  send: (snapshot: Snapshot) => void;
};

interface Session {
  code: string;
  quiz: Quiz;
  state: GameState;
  createdAt: number;
  startedAt: number | null;
  currentIndex: number; // -1 antes de começar
  endsAt: number | null;
  autoAdvance: boolean;
  players: Map<string, Player>;
  answers: Map<number, Map<string, AnswerRecord>>; // questionIndex -> playerId -> answer
  subscribers: Set<Subscriber>;
  timer: ReturnType<typeof setTimeout> | null;
  botTimers: ReturnType<typeof setTimeout>[];
  transitionAct: ActInfo | null;
}

interface Store {
  sessions: Map<string, Session>;
  quizzes: Map<string, Quiz>;
}

const g = globalThis as unknown as { __donsStore?: Store; __donsRestored?: boolean };

const store: Store =
  g.__donsStore ??
  (g.__donsStore = {
    sessions: new Map<string, Session>(),
    quizzes: new Map<string, Quiz>([[donsQuiz.id, donsQuiz]]),
  });

/* ------------------------------------------------------------------ */
/* Utilidades                                                           */
/* ------------------------------------------------------------------ */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

function makeCode(): string {
  for (let i = 0; i < 12; i++) {
    const candidate = `DONS${Math.floor(Math.random() * 90 + 10)}`;
    if (!store.sessions.has(candidate)) return candidate;
  }
  let code = randomCode();
  while (store.sessions.has(code)) code = randomCode();
  return code;
}

/** Cookie que identifica o jogador quando a entrada acontece sem JavaScript. */
export function playerCookieName(code: string): string {
  return `dons_p_${code.toUpperCase()}`;
}

export function newId(prefix = "p"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

const BOT_NAMES = [
  "Ana", "Bruno", "Carla", "Davi", "Elias", "Fernanda", "Gabriel", "Helena",
  "Isaque", "Joana", "Kelvin", "Lucas", "Marina", "Natan", "Olívia", "Pedro",
  "Quésia", "Rute", "Samuel", "Tainá", "Ubirajara", "Vitória", "Wesley",
  "Ximena", "Yasmin", "Zaqueu", "Priscila", "Áquila", "Timóteo", "Lídia",
];

function pruneOldSessions() {
  const cutoff = Date.now() - 8 * 60 * 60 * 1000;
  for (const [code, s] of store.sessions) {
    if (s.createdAt < cutoff) {
      if (s.timer) clearTimeout(s.timer);
      s.botTimers.forEach(clearTimeout);
      store.sessions.delete(code);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Criação / acesso                                                     */
/* ------------------------------------------------------------------ */

export function listQuizzes(): Quiz[] {
  return [...store.quizzes.values()];
}

export function getQuiz(id: string): Quiz | undefined {
  return store.quizzes.get(id);
}

export function saveQuiz(quiz: Quiz): Quiz {
  store.quizzes.set(quiz.id, quiz);
  return quiz;
}

export function createSession(quizId = donsQuiz.id): Session {
  pruneOldSessions();
  const quiz = store.quizzes.get(quizId) ?? donsQuiz;
  const code = makeCode();
  const session: Session = {
    code,
    quiz,
    state: "LOBBY",
    createdAt: Date.now(),
    startedAt: null,
    currentIndex: -1,
    endsAt: null,
    autoAdvance: false,
    players: new Map(),
    answers: new Map(),
    subscribers: new Set(),
    timer: null,
    botTimers: [],
    transitionAct: null,
  };
  store.sessions.set(code, session);
  return session;
}

export function getSession(code: string): Session | undefined {
  return store.sessions.get(code.toUpperCase().trim());
}

/* ------------------------------------------------------------------ */
/* Jogadores                                                            */
/* ------------------------------------------------------------------ */

function emptyDims(): Record<Dimension, { earned: number; possible: number }> {
  return {
    conhecimento: { earned: 0, possible: 0 },
    corpo: { earned: 0, possible: 0 },
    edificacao: { earned: 0, possible: 0 },
  };
}

export function joinSession(
  code: string,
  name: string,
  existingId?: string | null,
  isBot = false,
): { player: Player; session: Session } | { error: string } {
  const session = getSession(code);
  if (!session) return { error: "Sala não encontrada." };

  if (existingId) {
    const found = session.players.get(existingId);
    if (found) {
      if (name && name.trim() && name.trim() !== found.name) {
        found.name = sanitizeName(name);
      }
      broadcast(session);
      return { player: found, session };
    }
  }

  if (session.state !== "LOBBY" && session.state !== "COUNTDOWN") {
    // Entrada tardia continua permitida (o aluno atrasado joga daqui pra frente),
    // exceto quando o jogo já acabou.
    if (session.state === "RESULTS") return { error: "Esta partida já terminou." };
  }

  const clean = sanitizeName(name);
  if (!clean) return { error: "Informe um nome." };
  if (session.players.size >= 300) return { error: "Sala lotada." };

  const player: Player = {
    id: newId(isBot ? "bot" : "p"),
    name: clean,
    score: 0,
    isBot,
    joinedAt: Date.now(),
    dims: emptyDims(),
    correctCount: 0,
    answeredCount: 0,
  };
  session.players.set(player.id, player);
  broadcast(session);
  return { player, session };
}

function sanitizeName(name: string): string {
  return (name ?? "").replace(/\s+/g, " ").trim().slice(0, 18);
}

export function addBots(code: string, count: number): number {
  const session = getSession(code);
  if (!session) return 0;
  let added = 0;
  for (let i = 0; i < count; i++) {
    const base = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const name = `${base} ${Math.floor(Math.random() * 90 + 10)}`;
    const res = joinSession(code, name, null, true);
    if ("player" in res) added++;
  }
  // Se já houver uma pergunta em andamento, os bots recém-chegados participam dela.
  if (session.state === "QUESTION_ACTIVE") scheduleBotAnswers(session);
  broadcast(session);
  return added;
}

/* ------------------------------------------------------------------ */
/* Máquina de estados                                                   */
/* ------------------------------------------------------------------ */

function clearTimers(session: Session) {
  if (session.timer) clearTimeout(session.timer);
  session.timer = null;
  session.botTimers.forEach(clearTimeout);
  session.botTimers = [];
}

function setTimer(session: Session, ms: number, fn: () => void) {
  if (session.timer) clearTimeout(session.timer);
  session.timer = setTimeout(() => {
    session.timer = null;
    try {
      fn();
    } catch {
      /* mantém a sessão viva mesmo se um passo falhar */
    }
  }, ms);
}

function currentQuestion(session: Session): Question | null {
  return session.quiz.questions[session.currentIndex] ?? null;
}

export function startGame(code: string) {
  const session = getSession(code);
  if (!session || session.state !== "LOBBY") return;
  clearTimers(session);
  session.state = "COUNTDOWN";
  session.startedAt = Date.now();
  session.endsAt = Date.now() + 4200;
  broadcast(session);
  setTimer(session, 4200, () => goToQuestion(session, 0));
}

function goToQuestion(session: Session, index: number) {
  const q = session.quiz.questions[index];
  if (!q) {
    goToFinal(session);
    return;
  }
  const prev = session.quiz.questions[index - 1];
  session.currentIndex = index;
  if (!prev || prev.act !== q.act) {
    const act = session.quiz.acts.find((a) => a.act === q.act) ?? null;
    session.transitionAct = act;
    session.state = "TRANSITION";
    session.endsAt = Date.now() + 5200;
    broadcast(session);
    setTimer(session, 5200, () => openQuestion(session));
    return;
  }
  openQuestion(session);
}

function openQuestion(session: Session) {
  const q = currentQuestion(session);
  if (!q) return goToFinal(session);
  session.transitionAct = null;
  session.state = "QUESTION_ACTIVE";
  session.endsAt = Date.now() + q.timeLimitSec * 1000;
  if (!session.answers.has(session.currentIndex)) {
    session.answers.set(session.currentIndex, new Map());
  }
  broadcast(session);
  scheduleBotAnswers(session);
  setTimer(session, q.timeLimitSec * 1000 + 250, () => lockQuestion(session));
}

function lockQuestion(session: Session) {
  if (session.state !== "QUESTION_ACTIVE") return;
  session.state = "QUESTION_LOCKED";
  session.endsAt = null;
  broadcast(session);
  setTimer(session, 1500, () => revealQuestion(session));
}

function revealQuestion(session: Session) {
  if (session.state !== "QUESTION_LOCKED" && session.state !== "QUESTION_ACTIVE") return;
  session.state = "REVEAL";
  session.endsAt = null;
  broadcast(session);
  if (session.autoAdvance) setTimer(session, 12000, () => advance(session));
}

function goToLeaderboard(session: Session) {
  session.state = "LEADERBOARD";
  session.endsAt = null;
  broadcast(session);
  if (session.autoAdvance) setTimer(session, 8000, () => advance(session));
}

function goToFinal(session: Session) {
  clearTimers(session);
  session.state = "FINAL";
  session.endsAt = Date.now() + 11000;
  broadcast(session);
  setTimer(session, 11000, () => {
    session.state = "RESULTS";
    session.endsAt = null;
    broadcast(session);
  });
}

function nextQuestionOrEnd(session: Session) {
  const next = session.currentIndex + 1;
  if (next >= session.quiz.questions.length) {
    goToFinal(session);
    return;
  }
  goToQuestion(session, next);
}

/** Avança um passo na dinâmica (botão PRÓXIMA do professor). */
export function advance(code: string | Session) {
  const session = typeof code === "string" ? getSession(code) : code;
  if (!session) return;
  switch (session.state) {
    case "LOBBY":
      startGame(session.code);
      return;
    case "COUNTDOWN":
      clearTimers(session);
      goToQuestion(session, 0);
      return;
    case "TRANSITION":
      clearTimers(session);
      openQuestion(session);
      return;
    case "QUESTION_ACTIVE":
      clearTimers(session);
      lockQuestion(session);
      return;
    case "QUESTION_LOCKED":
      clearTimers(session);
      revealQuestion(session);
      return;
    case "REVEAL": {
      clearTimers(session);
      const q = currentQuestion(session);
      if (q?.leaderboardAfter && session.currentIndex < session.quiz.questions.length - 1) {
        goToLeaderboard(session);
      } else if (q?.leaderboardAfter) {
        goToLeaderboard(session);
      } else {
        nextQuestionOrEnd(session);
      }
      return;
    }
    case "LEADERBOARD":
      clearTimers(session);
      nextQuestionOrEnd(session);
      return;
    case "FINAL":
      clearTimers(session);
      session.state = "RESULTS";
      session.endsAt = null;
      broadcast(session);
      return;
    default:
      return;
  }
}

export function setAutoAdvance(code: string, value: boolean) {
  const session = getSession(code);
  if (!session) return;
  session.autoAdvance = value;
  if (value && (session.state === "REVEAL" || session.state === "LEADERBOARD")) {
    setTimer(session, 4000, () => advance(session));
  }
  broadcast(session);
}

export function resetSession(code: string) {
  const session = getSession(code);
  if (!session) return;
  clearTimers(session);
  session.state = "LOBBY";
  session.currentIndex = -1;
  session.endsAt = null;
  session.startedAt = null;
  session.transitionAct = null;
  session.answers = new Map();
  for (const p of session.players.values()) {
    p.score = 0;
    p.dims = emptyDims();
    p.correctCount = 0;
    p.answeredCount = 0;
  }
  broadcast(session);
}

/* ------------------------------------------------------------------ */
/* Respostas e pontuação                                                */
/* ------------------------------------------------------------------ */

export function submitAnswer(
  code: string,
  playerId: string,
  optionId: string,
): { ok: true } | { error: string } {
  const session = getSession(code);
  if (!session) return { error: "Sala não encontrada." };
  if (session.state !== "QUESTION_ACTIVE") return { error: "Respostas encerradas." };
  const player = session.players.get(playerId);
  if (!player) return { error: "Jogador não encontrado." };
  const q = currentQuestion(session);
  if (!q) return { error: "Nenhuma pergunta ativa." };
  if (!q.options.some((o) => o.id === optionId)) return { error: "Opção inválida." };

  const bucket = session.answers.get(session.currentIndex) ?? new Map();
  session.answers.set(session.currentIndex, bucket);
  if (bucket.has(playerId)) return { error: "Você já respondeu." }; // anti-cheat básico

  const now = Date.now();
  if (session.endsAt && now > session.endsAt + 400) return { error: "Tempo esgotado." };

  const correct = optionId === q.correctId;
  let points = 0;
  if (correct) {
    const total = q.timeLimitSec * 1000;
    const remaining = Math.max(0, Math.min(total, (session.endsAt ?? now) - now));
    points = q.basePoints + Math.round(q.speedBonus * (remaining / total));
  }

  bucket.set(playerId, { playerId, optionId, at: now, correct, points });
  player.score += points;
  player.answeredCount += 1;
  if (correct) player.correctCount += 1;
  for (const d of q.dimensions) {
    player.dims[d].possible += 1;
    if (correct) player.dims[d].earned += 1;
  }

  broadcast(session);

  // Todos responderam → encerra a votação um pouco antes do tempo.
  if (bucket.size >= session.players.size && session.players.size > 0) {
    setTimer(session, 700, () => lockQuestion(session));
  }
  return { ok: true };
}

function scheduleBotAnswers(session: Session) {
  const q = currentQuestion(session);
  if (!q) return;
  const window = q.timeLimitSec * 1000;
  for (const p of session.players.values()) {
    if (!p.isBot) continue;
    const bucket = session.answers.get(session.currentIndex);
    if (bucket?.has(p.id)) continue;
    const delay = 1500 + Math.random() * Math.max(2000, window * 0.7);
    const t = setTimeout(() => {
      // Bots acertam ~62% das vezes; o resto se espalha pelas outras alternativas.
      const roll = Math.random();
      let optionId = q.correctId;
      if (roll > 0.62) {
        const wrong = q.options.filter((o) => o.id !== q.correctId);
        optionId = wrong[Math.floor(Math.random() * wrong.length)].id;
      }
      submitAnswer(session.code, p.id, optionId);
    }, delay);
    session.botTimers.push(t);
  }
}

/* ------------------------------------------------------------------ */
/* Derivações / snapshot                                                */
/* ------------------------------------------------------------------ */

function distributionFor(session: Session, index: number): DistributionRow[] {
  const q = session.quiz.questions[index];
  const bucket = session.answers.get(index) ?? new Map<string, AnswerRecord>();
  const counts = new Map<string, number>();
  for (const a of bucket.values()) {
    counts.set(a.optionId, (counts.get(a.optionId) ?? 0) + 1);
  }
  const total = bucket.size || 1;
  return q.options.map((o) => {
    const count = counts.get(o.id) ?? 0;
    return {
      optionId: o.id,
      label: o.label,
      count,
      pct: Math.round((count / total) * 100),
      correct: o.id === q.correctId,
    };
  });
}

function correctPctFor(session: Session, index: number): number {
  const q = session.quiz.questions[index];
  const bucket = session.answers.get(index);
  if (!bucket || bucket.size === 0) return 0;
  let ok = 0;
  for (const a of bucket.values()) if (a.optionId === q.correctId) ok++;
  return Math.round((ok / bucket.size) * 100);
}

/**
 * Enquanto a votação está aberta (ou fechada mas ainda não revelada), a
 * pontuação da pergunta corrente fica oculta: exibi-la entregaria ao jogador
 * se ele acertou antes de o telão revelar.
 */
function visibleScore(session: Session, player: Player): number {
  const hideCurrent =
    session.state === "QUESTION_ACTIVE" || session.state === "QUESTION_LOCKED";
  if (!hideCurrent) return player.score;
  const pending = session.answers.get(session.currentIndex)?.get(player.id);
  return player.score - (pending?.points ?? 0);
}

function rankedPlayers(session: Session): { player: Player; score: number }[] {
  return [...session.players.values()]
    .map((player) => ({ player, score: visibleScore(session, player) }))
    .sort((a, b) => b.score - a.score || a.player.joinedAt - b.player.joinedAt);
}

function leaderboardOf(session: Session, limit = 50): LeaderboardRow[] {
  return rankedPlayers(session)
    .slice(0, limit)
    .map(({ player, score }, i) => ({
      id: player.id,
      name: player.name,
      score,
      rank: i + 1,
      isBot: player.isBot,
    }));
}

function rankOf(session: Session, playerId: string): number {
  return rankedPlayers(session).findIndex((r) => r.player.id === playerId) + 1;
}

/** Progresso coletivo do "Corpo em Construção" (0–100). */
export function bodyProgress(session: Session): number {
  if (session.state === "FINAL" || session.state === "RESULTS") return 100;
  const total = session.quiz.questions.length;
  const completed = countCompletedQuestions(session);
  if (completed === 0) return 0;
  const completedRatio = completed / total;
  const accuracy = overallAccuracy(session) / 100;
  const value = 100 * (completedRatio * 0.65 + completedRatio * accuracy * 0.35);
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countCompletedQuestions(session: Session): number {
  let n = 0;
  for (let i = 0; i < session.quiz.questions.length; i++) {
    if (!session.answers.has(i)) continue;
    const isCurrent = i === session.currentIndex;
    const revealed =
      session.state === "REVEAL" ||
      session.state === "LEADERBOARD" ||
      session.state === "FINAL" ||
      session.state === "RESULTS" ||
      session.state === "TRANSITION";
    if (!isCurrent || revealed) n++;
  }
  return n;
}

export function overallAccuracy(session: Session): number {
  let answers = 0;
  let correct = 0;
  for (const [index, bucket] of session.answers) {
    const q = session.quiz.questions[index];
    for (const a of bucket.values()) {
      answers++;
      if (a.optionId === q.correctId) correct++;
    }
  }
  if (answers === 0) return 0;
  return Math.round((correct / answers) * 100);
}

function statsFor(session: Session, index: number): QuestionStats {
  const q = session.quiz.questions[index];
  const bucket = session.answers.get(index) ?? new Map<string, AnswerRecord>();
  return {
    index,
    id: q.id,
    title: q.title,
    prompt: q.prompt,
    reference: q.reference,
    correctId: q.correctId,
    correctPct: correctPctFor(session, index),
    answers: bucket.size,
    distribution: distributionFor(session, index),
  };
}

export function buildReport(session: Session): FinalReport {
  const played = [...session.answers.keys()]
    .filter((i) => (session.answers.get(i)?.size ?? 0) > 0)
    .sort((a, b) => a - b);
  const questions = played.map((i) => statsFor(session, i));
  const sortedByCorrect = [...questions].sort((a, b) => b.correctPct - a.correctPct);
  // "Divergência" = turma mais dividida: menor concentração na alternativa mais votada.
  const divergences = [...questions]
    .map((q) => ({
      q,
      spread: Math.max(...q.distribution.map((d) => d.pct)),
    }))
    .sort((a, b) => a.spread - b.spread || a.q.correctPct - b.q.correctPct)
    .slice(0, 3)
    .map((x) => x.q);

  return {
    players: session.players.size,
    averageAccuracy: overallAccuracy(session),
    easiest: sortedByCorrect[0] ?? null,
    hardest: sortedByCorrect[sortedByCorrect.length - 1] ?? null,
    divergences,
    questions,
  };
}

const PROFILES: { min: number; profile: ProfileResult }[] = [
  {
    min: 0,
    profile: {
      key: "aprendiz",
      name: "APRENDIZ DE CORINTO",
      description: "Você está começando a conectar os princípios de 1Co 12–14. Ótimo ponto de partida.",
    },
  },
  {
    min: 0.4,
    profile: {
      key: "cooperador",
      name: "COOPERADOR",
      description: "Boa compreensão do papel dos membros no Corpo e da diversidade dos dons.",
    },
  },
  {
    min: 0.6,
    profile: {
      key: "edificador",
      name: "EDIFICADOR",
      description: "Você percebeu especialmente bem o propósito comunitário dos dons: edificar.",
    },
  },
  {
    min: 0.8,
    profile: {
      key: "construtor",
      name: "CONSTRUTOR DO CORPO",
      description: "Excelente desempenho geral: diversidade, amor e edificação bem articulados.",
    },
  },
  {
    min: 0.93,
    profile: {
      key: "mestre",
      name: "MESTRE DE CORINTO",
      description: "Performance excepcional nesta dinâmica. Você acompanhou o argumento de Paulo do início ao fim.",
    },
  },
];

function profileFor(player: Player): ProfileResult | null {
  if (player.answeredCount === 0) return null;
  const ratio = player.correctCount / player.answeredCount;
  let chosen = PROFILES[0].profile;
  for (const p of PROFILES) if (ratio >= p.min) chosen = p.profile;
  return chosen;
}

function dimensionsOf(player: Player): Record<Dimension, number> {
  const out = {} as Record<Dimension, number>;
  (Object.keys(player.dims) as Dimension[]).forEach((d) => {
    const { earned, possible } = player.dims[d];
    out[d] = possible === 0 ? 0 : Math.round((earned / possible) * 100);
  });
  return out;
}

function publicQuestion(session: Session, revealed: boolean): PublicQuestion | null {
  const q = currentQuestion(session);
  if (!q) return null;
  const base: PublicQuestion = {
    index: session.currentIndex,
    total: session.quiz.questions.length,
    id: q.id,
    act: q.act,
    kind: q.kind,
    title: q.title,
    prompt: q.prompt,
    options: q.options,
    reference: q.reference,
    timeLimitSec: q.timeLimitSec,
    scene: q.scene,
    setup: q.setup,
  };
  if (revealed) {
    base.correctId = q.correctId;
    base.explanation = q.explanation;
    base.headline = q.headline;
  }
  return base;
}

export function snapshotFor(session: Session, playerId: string | null): Snapshot {
  const revealed =
    session.state === "REVEAL" ||
    session.state === "LEADERBOARD" ||
    session.state === "FINAL" ||
    session.state === "RESULTS";
  const showDistribution =
    session.state === "QUESTION_LOCKED" || revealed;
  const bucket = session.answers.get(session.currentIndex);
  const inQuestion = session.currentIndex >= 0 && session.state !== "LOBBY";

  const act =
    session.transitionAct ??
    (currentQuestion(session)
      ? session.quiz.acts.find((a) => a.act === currentQuestion(session)!.act) ?? null
      : null);

  const snapshot: Snapshot = {
    code: session.code,
    quizTitle: session.quiz.title,
    quizTagline: session.quiz.tagline,
    state: session.state,
    autoAdvance: session.autoAdvance,
    startedAt: session.startedAt,
    serverNow: Date.now(),
    endsAt: session.endsAt,
    act,
    question: inQuestion ? publicQuestion(session, revealed) : null,
    players: [...session.players.values()]
      .sort((a, b) => b.joinedAt - a.joinedAt)
      .map<PlayerPublic>((p) => ({
        id: p.id,
        name: p.name,
        score: visibleScore(session, p),
        isBot: p.isBot,
        answered: !!bucket?.has(p.id),
      })),
    playerCount: session.players.size,
    answersReceived: bucket?.size ?? 0,
    distribution:
      showDistribution && session.currentIndex >= 0
        ? distributionFor(session, session.currentIndex)
        : null,
    correctPct:
      showDistribution && session.currentIndex >= 0
        ? correctPctFor(session, session.currentIndex)
        : null,
    leaderboard: leaderboardOf(session, 10),
    bodyProgress: bodyProgress(session),
    totalQuestions: session.quiz.questions.length,
    questionNumber: session.currentIndex >= 0 ? session.currentIndex + 1 : 0,
    report: session.state === "RESULTS" || session.state === "FINAL" ? buildReport(session) : null,
  };

  if (playerId) {
    const p = session.players.get(playerId);
    if (p) {
      const mine = bucket?.get(playerId) ?? null;
      snapshot.me = {
        id: p.id,
        name: p.name,
        score: visibleScore(session, p),
        rank: rankOf(session, p.id),
        of: session.players.size,
        answerOptionId: mine?.optionId ?? null,
        lastCorrect: revealed && mine ? mine.correct : null,
        lastPoints: revealed && mine ? mine.points : 0,
        dimensions: dimensionsOf(p),
        profile:
          session.state === "RESULTS" || session.state === "FINAL" ? profileFor(p) : null,
        correctCount: p.correctCount,
        answeredCount: p.answeredCount,
      };
    } else {
      snapshot.me = null;
    }
  }

  return snapshot;
}

/* ------------------------------------------------------------------ */
/* Realtime (SSE)                                                       */
/* ------------------------------------------------------------------ */

export function subscribe(
  session: Session,
  playerId: string | null,
  send: (snapshot: Snapshot) => void,
): () => void {
  const sub: Subscriber = { id: newId("sub"), playerId, send };
  session.subscribers.add(sub);
  send(snapshotFor(session, playerId));
  return () => {
    session.subscribers.delete(sub);
  };
}

export function broadcast(session: Session) {
  for (const sub of session.subscribers) {
    try {
      sub.send(snapshotFor(session, sub.playerId));
    } catch {
      session.subscribers.delete(sub);
    }
  }
  scheduleWrite(serializeStore);
}

/* ------------------------------------------------------------------ */
/* Retomada de partida após reinício do processo                        */
/* ------------------------------------------------------------------ */

interface PersistedSession {
  code: string;
  quizId: string;
  state: GameState;
  createdAt: number;
  startedAt: number | null;
  currentIndex: number;
  endsAt: number | null;
  autoAdvance: boolean;
  players: Player[];
  answers: [number, AnswerRecord[]][];
}

function serializeStore() {
  return {
    savedAt: Date.now(),
    quizzes: [...store.quizzes.values()].filter((q) => q.id !== donsQuiz.id),
    sessions: [...store.sessions.values()].map<PersistedSession>((s) => ({
      code: s.code,
      quizId: s.quiz.id,
      state: s.state,
      createdAt: s.createdAt,
      startedAt: s.startedAt,
      currentIndex: s.currentIndex,
      endsAt: s.endsAt,
      autoAdvance: s.autoAdvance,
      players: [...s.players.values()],
      answers: [...s.answers.entries()].map(([i, bucket]) => [i, [...bucket.values()]]),
    })),
  };
}

/** Reconstrói as salas e rearma os timers de onde a partida parou. */
function restoreStore() {
  const data = readState<{
    savedAt: number;
    quizzes?: Quiz[];
    sessions: PersistedSession[];
  }>();
  if (!data?.sessions?.length) return;

  // Descarta partidas velhas: retomar algo de ontem só confundiria.
  if (Date.now() - (data.savedAt ?? 0) > 6 * 60 * 60 * 1000) return;

  for (const quiz of data.quizzes ?? []) store.quizzes.set(quiz.id, quiz);

  for (const p of data.sessions) {
    const quiz = store.quizzes.get(p.quizId) ?? donsQuiz;
    const session: Session = {
      code: p.code,
      quiz,
      state: p.state,
      createdAt: p.createdAt,
      startedAt: p.startedAt,
      currentIndex: p.currentIndex,
      endsAt: p.endsAt,
      autoAdvance: p.autoAdvance,
      players: new Map(p.players.map((pl) => [pl.id, pl])),
      answers: new Map(
        p.answers.map(([i, records]) => [i, new Map(records.map((r) => [r.playerId, r]))]),
      ),
      subscribers: new Set(),
      timer: null,
      botTimers: [],
      transitionAct: null,
    };
    store.sessions.set(session.code, session);
    resumeTimers(session);
  }
}

function resumeTimers(session: Session) {
  const now = Date.now();
  const remaining = session.endsAt ? session.endsAt - now : 0;

  switch (session.state) {
    case "COUNTDOWN":
      if (remaining > 0) setTimer(session, remaining, () => goToQuestion(session, 0));
      else goToQuestion(session, 0);
      return;
    case "TRANSITION": {
      const act = session.quiz.questions[session.currentIndex]?.act;
      session.transitionAct = session.quiz.acts.find((a) => a.act === act) ?? null;
      if (remaining > 0) setTimer(session, remaining, () => openQuestion(session));
      else openQuestion(session);
      return;
    }
    case "QUESTION_ACTIVE":
      // A pergunta continua valendo pelo tempo que sobrou; se já venceu
      // durante a queda, fecha a votação e revela.
      if (remaining > 500) {
        scheduleBotAnswers(session);
        setTimer(session, remaining, () => lockQuestion(session));
      } else {
        session.state = "QUESTION_LOCKED";
        session.endsAt = null;
        setTimer(session, 1200, () => revealQuestion(session));
      }
      return;
    case "QUESTION_LOCKED":
      setTimer(session, 1200, () => revealQuestion(session));
      return;
    case "FINAL":
      if (remaining > 0) {
        setTimer(session, remaining, () => {
          session.state = "RESULTS";
          session.endsAt = null;
          broadcast(session);
        });
      } else {
        session.state = "RESULTS";
        session.endsAt = null;
      }
      return;
    default:
      // LOBBY, REVEAL, LEADERBOARD e RESULTS esperam o professor.
      return;
  }
}

if (!g.__donsRestored) {
  g.__donsRestored = true;
  try {
    restoreStore();
  } catch {
    /* estado corrompido: começa limpo em vez de derrubar o servidor */
  }
}

export type { Session, Player };
