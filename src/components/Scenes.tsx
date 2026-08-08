"use client";

import { useEffect, useState } from "react";

/** ATO 2 — o corpo formado apenas por olhos, que depois se diversifica. */
export function EyesScene({ revealed }: { revealed: boolean }) {
  const eyes = ["👁", "👁", "👁", "👁", "👁"];
  const members = ["👁", "👂", "🖐", "🦶", "❤️"];
  const shown = revealed ? members : eyes;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3 text-5xl md:text-6xl">
        {shown.map((glyph, i) => (
          <span
            key={`${revealed ? "m" : "e"}-${i}`}
            className="pop-in inline-block"
            style={{ animationDelay: `${i * 110}ms` }}
          >
            {glyph}
          </span>
        ))}
      </div>
      <p
        className={`display text-center text-xl md:text-2xl transition-colors ${
          revealed ? "text-amber-200" : "text-white/45"
        }`}
      >
        {revealed
          ? "A diversidade não é um defeito do Corpo. É parte do projeto."
          : "Um corpo inteiro de olhos..."}
      </p>
    </div>
  );
}

/** ATO 3 — o boss round: o acúmulo de dons e a subtração do amor. */
export function BossScene({
  lines,
  revealed,
  active,
}: {
  lines: string[];
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
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="display shake-soft text-center text-4xl md:text-7xl text-amber-300 text-glow">
          DOM <span className="text-white/60">−</span> AMOR <span className="text-white/60">=</span>{" "}
          <span className="text-rose-300">NADA</span>
        </div>
        <p className="max-w-2xl text-center text-lg md:text-xl text-white/80">
          O amor não é mais um dom da lista. Ele governa a maneira como os dons são exercidos.
        </p>
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

const FINAL_BEATS = [
  { at: 0, lines: ["UM CORPO.", "MUITOS MEMBROS.", "O MESMO ESPÍRITO."], tone: "text-white" },
  { at: 4200, lines: ["DIFERENTES DONS.", "UM MESMO PROPÓSITO."], tone: "text-sky-200" },
  { at: 7600, lines: ["AMOR + EDIFICAÇÃO"], tone: "text-amber-300" },
];

/** ATO 4 — encerramento coletivo: as partes convergem e formam o Corpo. */
export function FinalScene({ intensity = 1 }: { intensity?: number }) {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const timers = FINAL_BEATS.map((b, i) => setTimeout(() => setBeat(i), b.at));
    return () => timers.forEach(clearTimeout);
  }, []);

  const current = FINAL_BEATS[beat];
  const parts = ["👁", "👂", "🖐", "🦶", "❤️"];

  return (
    <div className="relative flex flex-col items-center justify-center gap-8 py-8">
      <div className="relative flex items-center gap-4 text-5xl md:text-7xl">
        {parts.map((glyph, i) => (
          <span
            key={glyph}
            className="converge inline-block"
            style={
              {
                "--dx": `${(i - 2) * 120}px`,
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

/** Contagem regressiva 3 · 2 · 1 · DONS. */
export function Countdown({ remainingMs }: { remainingMs: number }) {
  const s = Math.ceil(remainingMs / 1000);
  const label = s >= 4 ? "PREPARE-SE" : s === 3 ? "3" : s === 2 ? "2" : s === 1 ? "1" : "DONS";
  return (
    <div className="grid min-h-dvh place-items-center">
      <div key={label} className="count-zoom display text-center text-8xl md:text-[12rem] text-glow">
        {label}
      </div>
    </div>
  );
}
