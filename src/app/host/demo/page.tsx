"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Stage, Wordmark } from "@/components/ui";

/** Cria uma sala já povoada com bots — para testar o fluxo sem 25 celulares. */
export default function HostDemo() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const res = await fetch("/api/sessions", { method: "POST" });
        const { code } = await res.json();
        await fetch(`/api/sessions/${code}/host`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "bots", count: 12 }),
        });
        router.replace(`/host/${code}?demo=1`);
      } catch {
        router.replace("/");
      }
    })();
  }, [router]);

  return (
    <Stage act={0}>
      <main className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-4">
          <Wordmark size="text-4xl" />
          <p className="pulse-soft text-white/60">Montando sala de demonstração com bots...</p>
        </div>
      </main>
    </Stage>
  );
}
