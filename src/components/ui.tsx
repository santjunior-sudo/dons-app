"use client";

import type { ReactNode } from "react";
import type { Act } from "@/lib/types";

export function Stage({
  act,
  children,
  className = "",
}: {
  act?: Act | 0 | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`stage act-${act ?? 0} min-h-dvh w-full ${className}`}>{children}</div>
  );
}

export function Wordmark({ size = "text-3xl" }: { size?: string }) {
  return (
    <div className="flex items-center gap-3">
      <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden>
        <defs>
          <linearGradient id="wm" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="60%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="17" fill="none" stroke="url(#wm)" strokeWidth="2.5" />
        <circle cx="20" cy="20" r="6" fill="url(#wm)" />
        <g stroke="url(#wm)" strokeWidth="2" strokeLinecap="round">
          <path d="M20 3 L20 11" />
          <path d="M20 29 L20 37" />
          <path d="M3 20 L11 20" />
          <path d="M29 20 L37 20" />
        </g>
      </svg>
      <span className={`display ${size} text-glow`}>DONS</span>
    </div>
  );
}

export function TimerRing({
  remainingMs,
  totalSec,
  size = 84,
}: {
  remainingMs: number;
  totalSec: number;
  size?: number;
}) {
  const total = Math.max(1, totalSec * 1000);
  const ratio = Math.max(0, Math.min(1, remainingMs / total));
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const seconds = Math.ceil(remainingMs / 1000);
  const urgent = seconds <= 5;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={urgent ? "#fb7185" : "#38bdf8"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          style={{ transition: "stroke-dashoffset 120ms linear, stroke 300ms ease" }}
        />
      </svg>
      <span
        className={`tabular absolute display ${urgent ? "text-rose-300" : "text-white"}`}
        style={{ fontSize: size * 0.34 }}
        aria-live="off"
      >
        {seconds}
      </span>
    </div>
  );
}

export function Chip({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "amber" | "violet" }) {
  const tones = {
    default: "",
    amber: "border-amber-300/50 bg-amber-300/15 text-amber-200",
    violet: "border-violet-300/50 bg-violet-300/15 text-violet-200",
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}

export function Reference({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 font-mono text-[0.78rem] font-bold text-amber-200">
      📖 {children}
    </span>
  );
}
