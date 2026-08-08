"use client";

import Link from "next/link";
import { CHURCH_NAME } from "@/lib/branding";
import { Stage, Wordmark } from "@/components/ui";

/** A entrada do aluno é pelo QR Code do telão. Esta tela é só um aviso. */
export default function JoinPage() {
  return (
    <Stage act={0}>
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6 py-12 text-center">
        <div className="flex flex-col items-center gap-2">
          <Wordmark size="text-3xl" />
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200/80">
            {CHURCH_NAME}
          </p>
        </div>

        <div className="rise">
          <h1 className="display text-3xl">Escaneie o QR Code do telão</h1>
          <p className="mt-3 text-white/65">
            É só apontar a câmera do celular para o telão e digitar seu nome. Não precisa de
            código nem de cadastro.
          </p>
        </div>

        <Link href="/" className="btn btn-ghost self-center">
          Voltar ao início
        </Link>
      </main>
    </Stage>
  );
}
