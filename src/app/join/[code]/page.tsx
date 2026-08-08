"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CHURCH_NAME } from "@/lib/branding";
import { Stage, Wordmark } from "@/components/ui";
import { lastName, loadPlayer, rememberName, savePlayer } from "@/lib/playerStorage";

export default function JoinCodePage() {
  const params = useParams<{ code: string }>();
  const code = (params?.code ?? "").toUpperCase();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const erro = new URLSearchParams(window.location.search).get("erro");
    if (erro) setError(erro);
    const stored = loadPlayer(code);
    if (stored) {
      // Reconexão: já jogamos nesta sala neste dispositivo.
      router.replace(`/play/${code}`);
      return;
    }
    setName(lastName());
  }, [code, router]);

  /**
   * Caminho rápido com JS. Se o JavaScript não tiver assumido a página ainda,
   * o `action` do formulário faz o POST nativo e o servidor redireciona —
   * a entrada funciona de qualquer jeito.
   */
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const typed = String(new FormData(form).get("name") ?? "").trim();
    if (!typed) {
      e.preventDefault();
      setError("Digite seu nome para entrar.");
      return;
    }
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: typed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível entrar.");
        setBusy(false);
        return;
      }
      savePlayer(code, { playerId: data.playerId, name: data.name });
      rememberName(data.name);
      router.replace(`/play/${code}`);
    } catch {
      // Falhou o fetch? Deixa o navegador enviar o formulário do jeito antigo.
      form.submit();
    }
  }

  return (
    <Stage act={0}>
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-6 py-12">
        <div className="flex flex-col gap-2">
          <Wordmark size="text-2xl" />
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200/80">
            {CHURCH_NAME}
          </p>
        </div>

        <div className="rise">
          <h1 className="display text-4xl">Como podemos te chamar?</h1>
          <p className="mt-2 text-white/65">Seu nome aparecerá no telão.</p>
        </div>

        <form
          action={`/api/sessions/${code}/join`}
          method="post"
          onSubmit={submit}
          className="rise flex flex-col gap-3"
          style={{ animationDelay: "120ms" }}
        >
          <label htmlFor="name" className="sr-only">
            Seu nome
          </label>
          <input
            id="name"
            name="name"
            className="input"
            defaultValue={name}
            key={name}
            onChange={(e) => setName(e.target.value.slice(0, 18))}
            placeholder="Seu nome ou apelido"
            autoComplete="nickname"
            maxLength={18}
            required
            autoFocus
          />
          {error && (
            <p role="alert" className="rounded-xl bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-200">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary text-lg">
            {busy ? "Entrando..." : "ENTRAR NO DESAFIO"}
          </button>
        </form>

        <p className="text-center text-xs text-white/40">Sala {code}</p>
      </main>
    </Stage>
  );
}
