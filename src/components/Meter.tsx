"use client";

import BodyMeter from "@/components/BodyMeter";
import UnityMeter from "@/components/UnityMeter";
import type { MeterConfig } from "@/lib/types";

interface Props {
  meter: MeterConfig;
  progress: number;
  size?: number;
  compact?: boolean;
  celebrate?: boolean;
}

/** Indicador coletivo da turma — a forma vem do quiz em jogo. */
export default function Meter({ meter, progress, size = 260, compact = false, celebrate = false }: Props) {
  const p = Math.max(0, Math.min(100, progress));

  return (
    <div className="flex flex-col items-center gap-3">
      {meter.variant === "unity" ? (
        <UnityMeter progress={p} size={size} celebrate={celebrate} />
      ) : (
        <BodyMeter progress={p} size={size} celebrate={celebrate} />
      )}

      {!compact && (
        <div className="w-full max-w-xs">
          <div className="flex items-baseline justify-between text-xs font-black uppercase tracking-[0.18em] text-white/60">
            <span>{meter.title}</span>
            <span className="tabular text-white">{p}%</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 via-sky-400 to-amber-300 transition-all duration-700"
              style={{ width: `${p}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wider">
            {meter.stages.map((s) => (
              <span key={s.label} className={p >= s.at ? "text-white" : "text-white/30"}>
                {s.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
