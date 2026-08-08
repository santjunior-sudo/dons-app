"use client";

interface Props {
  progress: number; // 0..100
  size?: number;
  celebrate?: boolean;
}

/**
 * "Corpo em Construção": constelação estilizada que ganha membros conforme
 * a turma avança. Não é anatômico — é um indicador coletivo.
 */
export default function BodyMeter({ progress, size = 260, celebrate = false }: Props) {
  const p = Math.max(0, Math.min(100, progress));
  const on = (at: number) => p >= at;
  const dim = (at: number) => (on(at) ? 1 : 0.12);

  return (
    <svg
      viewBox="0 0 200 300"
      width={size}
      height={size * 1.28}
      className={celebrate ? "body-glow" : ""}
      role="img"
      aria-label={`Corpo em construção: ${p}% completo`}
    >
      <defs>
        <linearGradient id="bm-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="55%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <radialGradient id="bm-heart">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#fb7185" />
        </radialGradient>
      </defs>

      {/* Estrutura base sempre visível, discreta */}
      <g stroke="url(#bm-core)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.22">
        <path d="M100 62 L100 168" />
        <path d="M100 88 L44 128 M100 88 L156 128" />
        <path d="M100 168 L64 250 M100 168 L136 250" />
      </g>

      {/* Torso / eixo — aparece cedo */}
      <g
        stroke="url(#bm-core)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        style={{ transition: "opacity 700ms ease" }}
        opacity={p > 5 ? 0.95 : 0.25}
      >
        <path d="M100 62 L100 168" />
      </g>

      {/* Cabeça + visão (20%) */}
      <g style={{ transition: "opacity 700ms ease" }} opacity={dim(20)}>
        <circle cx="100" cy="44" r="20" fill="none" stroke="url(#bm-core)" strokeWidth="4" />
        <circle cx="100" cy="44" r="6.5" fill="#38bdf8" />
        <circle cx="100" cy="44" r="2.5" fill="#fff" />
      </g>

      {/* Audição (40%) */}
      <g
        style={{ transition: "opacity 700ms ease" }}
        opacity={dim(40)}
        fill="none"
        stroke="#a78bfa"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M74 36 q-9 8 0 17" />
        <path d="M126 36 q9 8 0 17" />
        <path d="M66 30 q-14 14 0 29" opacity="0.55" />
        <path d="M134 30 q14 14 0 29" opacity="0.55" />
      </g>

      {/* Braços + mãos (60%) */}
      <g style={{ transition: "opacity 700ms ease" }} opacity={dim(60)}>
        <path
          d="M100 88 L44 128 M100 88 L156 128"
          stroke="url(#bm-core)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="42" cy="130" r="9" fill="#38bdf8" />
        <circle cx="158" cy="130" r="9" fill="#38bdf8" />
      </g>

      {/* Pernas + pés (80%) */}
      <g style={{ transition: "opacity 700ms ease" }} opacity={dim(80)}>
        <path
          d="M100 168 L64 250 M100 168 L136 250"
          stroke="url(#bm-core)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="62" cy="253" r="9" fill="#a78bfa" />
        <circle cx="138" cy="253" r="9" fill="#a78bfa" />
      </g>

      {/* Coração (100%) */}
      <g
        style={{ transition: "opacity 700ms ease" }}
        opacity={dim(100)}
        className={on(100) ? "pulse-soft" : ""}
      >
        <circle cx="100" cy="118" r="18" fill="url(#bm-heart)" />
        <circle cx="100" cy="118" r="30" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.5" />
      </g>
    </svg>
  );
}
