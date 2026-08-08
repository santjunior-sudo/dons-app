"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Snapshot } from "@/lib/types";

interface UseGame {
  snapshot: Snapshot | null;
  connected: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Assina o estado da sala via SSE, com polling de resgate quando o stream cai
 * (troca de rede, celular voltando do bloqueio, proxy encerrando conexão).
 */
export function useGame(code: string | null, playerId: string | null): UseGame {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEventRef = useRef(0);

  const refresh = useCallback(() => {
    if (!code) return;
    const qs = playerId ? `?playerId=${encodeURIComponent(playerId)}` : "";
    fetch(`/api/sessions/${code}${qs}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Falha");
        return r.json();
      })
      .then((s: Snapshot) => {
        setSnapshot(s);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [code, playerId]);

  useEffect(() => {
    if (!code) return;
    let closed = false;
    const qs = playerId ? `?playerId=${encodeURIComponent(playerId)}` : "";
    const es = new EventSource(`/api/sessions/${code}/stream${qs}`);

    es.addEventListener("state", (ev) => {
      if (closed) return;
      try {
        setSnapshot(JSON.parse((ev as MessageEvent).data) as Snapshot);
        lastEventRef.current = Date.now();
        setConnected(true);
        setError(null);
      } catch {
        /* ignora frames corrompidos */
      }
    });

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    /*
     * O servidor manda um snapshot assim que a assinatura abre. Se nada chegou
     * em 6s, este proxy está segurando o stream: fecha a conexão em vez de
     * manter 50 sockets pendurados e segue só no polling.
     */
    const sseWatchdog = setTimeout(() => {
      if (lastEventRef.current === 0) es.close();
    }, 6000);

    /*
     * O SSE é o caminho rápido, mas alguns proxies (túneis, Wi-Fi corporativo,
     * operadoras) seguram o stream sem derrubar a conexão — o navegador fica
     * "conectado" e nunca recebe nada. Por isso o polling é incondicional:
     * ele só folga quando chegou evento recente pelo stream.
     */
    pollRef.current = setInterval(() => {
      if (Date.now() - lastEventRef.current > 2000) refresh();
    }, 1500);

    refresh();

    return () => {
      closed = true;
      clearTimeout(sseWatchdog);
      es.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [code, playerId, refresh]);

  return { snapshot, connected, error, refresh };
}

/** Milissegundos restantes, corrigidos pela diferença de relógio com o servidor. */
export function useRemaining(endsAt: number | null, serverNow: number | undefined): number {
  const [remaining, setRemaining] = useState(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    if (serverNow) offsetRef.current = serverNow - Date.now();
  }, [serverNow]);

  useEffect(() => {
    if (!endsAt) {
      const zero = setTimeout(() => setRemaining(0), 0);
      return () => clearTimeout(zero);
    }
    const compute = () =>
      setRemaining(Math.max(0, endsAt - (Date.now() + offsetRef.current)));
    const first = setTimeout(compute, 0);
    const id = setInterval(compute, 100);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [endsAt]);

  return remaining;
}
