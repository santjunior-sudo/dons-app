"use client";

import { useEffect, useState } from "react";
import type { FinaleConfig, GlyphScene } from "@/lib/types";

/** Cena de símbolos: o "antes" vira "depois" quando o telão revela. */
export function GlyphsScene({ glyphs, revealed }: { glyphs: GlyphScene; revealed: boolean }) {
  const shown = revealed ? glyphs.after : glyphs.before;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3 text-5xl md:text-6xl">
        {shown.map((glyph, i) => (
          <span
            key={`${revealed ? "a" : "b"}-${i}`}
            className="pop-in inline-block"
            style={{ animationDelay: `${i * 110}ms` }}
          >
            {glyph}
          </span>
        ))}
      </div>
      <p
        className={`display text-balance text-center text-xl md:text-2xl transition-colors ${
          revealed ? "text-amber-200" : "text-white/45"
        }`}
      >
        {revealed ? glyphs.captionAfter : glyphs.captionBefore}
      </p>
    </div>
  );
}

/** Boss round: o acúmulo revelado linha a linha e a virada na revelação. */
export function BossScene({
  lines,
  headline,
  note,
  revealed,
  active,
}: {
  lines: string[];
  headline?: string;
  note?: string;
  revealed: boolean;
  active: boolean;
}) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (!active) return;
    setVisible(0);
    const timers = lines.map((_, i) =>
      setTimeout(() => setVisible((v) => Math.max(v, i + 1)), 500 + i * 1100),
    );
    return () => timers.forEach(clearTimeout);
  }, [active, lines]);

  if (revealed) {
    return (
      <div className="flex flex-col items-center gap-5 py-3">
        <div className="display shake-soft text-balance text-center text-4xl md:text-6xl text-amber-300 text-glow">
          {headline}
        </div>
        {note && (
          <p className="max-w-3xl text-balance text-center text-lg md:text-xl text-white/80">
            {note}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      {lines.map((line, i) => (
        <p
          key={line}
          className={`text-center text-lg md:text-2xl font-bold transition-all duration-500 ${
            i < visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          } ${i === lines.length - 1 ? "text-rose-300 display text-2xl md:text-4xl mt-2" : "text-white/85"}`}
        >
          {line}
        </p>
      ))}
    </div>
  );
}

/** Encerramento coletivo: os símbolos convergem e as frases entram em sequência. */
export function FinalScene({
  finale,
  intensity = 1,
}: {
  finale: FinaleConfig;
  intensity?: number;
}) {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const timers = finale.beats.map((b, i) => setTimeout(() => setBeat(i), b.at));
    return () => timers.forEach(clearTimeout);
  }, [finale]);

  const current = finale.beats[beat] ?? finale.beats[0];

  return (
    <div className="relative flex flex-col items-center justify-center gap-8 py-8">
      <div className="relative flex items-center gap-4 text-5xl md:text-7xl">
        {finale.glyphs.map((glyph, i) => (
          <span
            key={`${glyph}-${i}`}
            className="converge inline-block"
            style={
              {
                "--dx": `${(i - (finale.glyphs.length - 1) / 2) * 120}px`,
                "--dy": `${i % 2 === 0 ? -90 : 90}px`,
                animationDelay: `${i * 120}ms`,
              } as React.CSSProperties
            }
          >
            {glyph}
          </span>
        ))}
      </div>

      <div key={beat} className="flex flex-col items-center gap-1">
        {current.lines.map((line, i) => (
          <p
            key={line}
            className={`display rise text-center text-4xl md:text-7xl text-glow ${current.tone}`}
            style={{ animationDelay: `${i * 220}ms` }}
          >
            {line}
          </p>
        ))}
      </div>

      {/* Intensidade da celebração vem do desempenho coletivo. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {Array.from({ length: Math.round(10 + intensity * 26) }).map((_, i) => (
          <span
            key={i}
            className="float-up absolute text-xl"
            style={{
              left: `${(i * 37) % 100}%`,
              bottom: "-40px",
              animationDelay: `${(i % 12) * 0.35}s`,
              opacity: 0.5,
            }}
          >
            {["✦", "✧", "★", "•"][i % 4]}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Contagem regressiva 3 · 2 · 1. */
export function Countdown({ remainingMs, word }: { remainingMs: number; word: string }) {
  const s = Math.ceil(remainingMs / 1000);
  const label = s >= 4 ? "PREPARE-SE" : s === 3 ? "3" : s === 2 ? "2" : s === 1 ? "1" : word;
  return (
    <div className="grid min-h-dvh place-items-center">
      <div
        key={label}
        className="count-zoom display text-balance text-center text-7xl md:text-[10rem] text-glow"
      >
        {label}
      </div>
    </div>
  );
}
