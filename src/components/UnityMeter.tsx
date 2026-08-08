"use client";

interface Props {
  progress: number; // 0..100
  size?: number;
  celebrate?: boolean;
}

/**
 * Indicador coletivo de João 17: pontos dispersos que vão se aproximando de um
 * mesmo centro. Quanto mais a turma avança, mais o círculo se fecha — até que
 * os muitos formam um só.
 */
export default function UnityMeter({ progress, size = 260, celebrate = false }: Props) {
  const p = Math.max(0, Math.min(100, progress));
  const t = p / 100;
  const cx = 100;
  const cy = 100;
  const outer = 78;
  // Os pontos partem da borda e caminham para o centro conforme o progresso.
  const radius = outer - (outer - 26) * t;
  const dots = Array.from({ length: 8 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      key: i,
    };
  });

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={celebrate ? "body-glow" : ""}
      role="img"
      aria-label={`Unidade da turma: ${p}% completo`}
    >
      <defs>
        <linearGradient id="um-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="55%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <radialGradient id="um-core">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#fb7185" />
        </radialGradient>
      </defs>

      {/* Órbita de referência */}
      <circle cx={cx} cy={cy} r={outer} fill="none" stroke="url(#um-line)" strokeWidth="1.5" opacity="0.18" />

      {/* Linhas ligando cada ponto ao centro: aparecem conforme a aproximação */}
      <g stroke="url(#um-line)" strokeWidth="1.5" strokeLinecap="round" opacity={0.15 + t * 0.55}>
        {dots.map((d) => (
          <line
            key={`l-${d.key}`}
            x1={d.x}
            y1={d.y}
            x2={cx}
            y2={cy}
            style={{ transition: "all 800ms cubic-bezier(0.16,1,0.3,1)" }}
          />
        ))}
      </g>

      {/* Os muitos */}
      {dots.map((d) => (
        <circle
          key={`d-${d.key}`}
          cx={d.x}
          cy={d.y}
          r={5 + t * 2}
          fill={d.key % 2 === 0 ? "#38bdf8" : "#a78bfa"}
          style={{ transition: "all 800ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      ))}

      {/* O centro: cresce e acende quando a turma fecha o círculo */}
      <circle
        cx={cx}
        cy={cy}
        r={8 + t * 16}
        fill="url(#um-core)"
        opacity={0.35 + t * 0.65}
        className={p >= 100 ? "pulse-soft" : ""}
        style={{ transition: "all 800ms cubic-bezier(0.16,1,0.3,1)" }}
      />
      {p >= 100 && (
        <circle cx={cx} cy={cy} r={44} fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.5" />
      )}
    </svg>
  );
}
