"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Stage, Wordmark } from "@/components/ui";
import BodyMeter from "@/components/BodyMeter";
import { CHURCH_NAME, EVENT_SUBTITLE } from "@/lib/branding";

export default function Home() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function createRoom() {
    setCreating(true);
    try {
      const res = await fetch("/api/sessions", { method: "POST" });
      const data = await res.json();
      router.push(`/host/${data.code}`);
    } catch {
      setCreating(false);
    }
  }

  return (
    <Stage act={0}>
      <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-center gap-10 px-6 py-14 text-center">
        <div className="rise flex flex-col items-center gap-5">
          <div className="flex flex-col items-center gap-2">
            <p className="display text-lg md:text-2xl text-amber-200">{CHURCH_NAME}</p>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">
              {EVENT_SUBTITLE}
            </p>
          </div>
          <span className="chip">1 Coríntios 12–14</span>
          <div className="flex flex-col items-center gap-2">
            <Wordmark size="text-6xl md:text-8xl" />
            <p className="display text-2xl md:text-4xl text-white/85">O Corpo em Ação</p>
          </div>
          <p className="max-w-xl text-balance text-lg text-white/70">
            Uma experiência interativa sobre dons espirituais, amor e edificação em 1 Coríntios 12–14.
          </p>
          <p className="max-w-lg text-sm font-semibold text-amber-200/90">
            Diferentes dons. O mesmo Espírito. Um só Corpo. E o amor como caminho.
          </p>
        </div>

        <div className="rise flex w-full max-w-md flex-col gap-3" style={{ animationDelay: "160ms" }}>
          <button className="btn btn-primary text-lg" onClick={createRoom} disabled={creating}>
            {creating ? "Criando sala..." : "CRIAR DESAFIO"}
          </button>
          <p className="text-center text-sm text-white/55">
            Os alunos entram escaneando o QR Code do telão — sem código, sem cadastro.
          </p>
          <div className="mt-2 flex justify-center gap-4 text-xs font-semibold uppercase tracking-widest text-white/45">
            <Link href="/host/demo" className="hover:text-white">
              Modo demo
            </Link>
            <Link href="/admin" className="hover:text-white">
              Perguntas
            </Link>
          </div>
        </div>

        <div className="rise opacity-80" style={{ animationDelay: "300ms" }}>
          <BodyMeter progress={62} size={150} compact />
          <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-white/45">
            Corpo em construção
          </p>
        </div>
      </main>
    </Stage>
  );
}
