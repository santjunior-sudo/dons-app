export type Dimension = "conhecimento" | "corpo" | "edificacao";

export type QuestionKind = "standard" | "boss" | "final";

/** Cenas cinematográficas especiais renderizadas no host. */
export type Scene = "eyes" | "boss" | "final";

export type Act = 1 | 2 | 3 | 4;

export interface Option {
  id: string; // "A" | "B" | "C" | "D"
  label: string;
}

export interface Question {
  id: string;
  act: Act;
  kind: QuestionKind;
  title: string;
  prompt: string;
  options: Option[];
  correctId: string;
  explanation: string;
  reference: string;
  timeLimitSec: number;
  basePoints: number;
  speedBonus: number;
  dimensions: Dimension[];
  scene?: Scene;
  /** Frase grande exibida no telão após a revelação. */
  headline?: string;
  /** Texto extra do host durante a pergunta (setup do boss, caso prático...). */
  setup?: string[];
  /** Mostrar ranking depois desta pergunta. */
  leaderboardAfter?: boolean;
}

export interface ActInfo {
  act: Act;
  title: string;
  subtitle: string;
  tag: string;
}

export interface Quiz {
  id: string;
  title: string;
  tagline: string;
  acts: ActInfo[];
  questions: Question[];
}

export type GameState =
  | "LOBBY"
  | "COUNTDOWN"
  | "TRANSITION"
  | "QUESTION_ACTIVE"
  | "QUESTION_LOCKED"
  | "REVEAL"
  | "LEADERBOARD"
  | "FINAL"
  | "RESULTS";

export interface PlayerPublic {
  id: string;
  name: string;
  score: number;
  isBot: boolean;
  answered: boolean;
}

export interface LeaderboardRow {
  id: string;
  name: string;
  score: number;
  rank: number;
  isBot: boolean;
}

export interface DistributionRow {
  optionId: string;
  label: string;
  count: number;
  pct: number;
  correct: boolean;
}

export interface QuestionStats {
  index: number;
  id: string;
  title: string;
  prompt: string;
  reference: string;
  correctId: string;
  correctPct: number;
  answers: number;
  distribution: DistributionRow[];
}

export interface FinalReport {
  players: number;
  averageAccuracy: number;
  easiest: QuestionStats | null;
  hardest: QuestionStats | null;
  divergences: QuestionStats[];
  questions: QuestionStats[];
}

export interface ProfileResult {
  key: string;
  name: string;
  description: string;
}

export interface MeView {
  id: string;
  name: string;
  score: number;
  rank: number;
  of: number;
  /** Opção escolhida na pergunta corrente (se houver). */
  answerOptionId: string | null;
  /** Resultado da pergunta corrente — só preenchido a partir do REVEAL. */
  lastCorrect: boolean | null;
  lastPoints: number;
  dimensions: Record<Dimension, number>;
  profile: ProfileResult | null;
  correctCount: number;
  answeredCount: number;
}

export interface PublicQuestion {
  index: number;
  total: number;
  id: string;
  act: Act;
  kind: QuestionKind;
  title: string;
  prompt: string;
  options: Option[];
  reference: string;
  timeLimitSec: number;
  scene?: Scene;
  setup?: string[];
  /** Só chega no REVEAL. */
  correctId?: string;
  explanation?: string;
  headline?: string;
}

export interface Snapshot {
  code: string;
  quizTitle: string;
  quizTagline: string;
  state: GameState;
  autoAdvance: boolean;
  startedAt: number | null;
  serverNow: number;
  endsAt: number | null;
  act: ActInfo | null;
  question: PublicQuestion | null;
  players: PlayerPublic[];
  playerCount: number;
  answersReceived: number;
  distribution: DistributionRow[] | null;
  correctPct: number | null;
  leaderboard: LeaderboardRow[];
  bodyProgress: number; // 0..100
  totalQuestions: number;
  questionNumber: number; // 1-based, 0 fora de pergunta
  report: FinalReport | null;
  me?: MeView | null;
}
