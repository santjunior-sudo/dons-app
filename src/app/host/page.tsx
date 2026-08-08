"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Stage, Wordmark } from "@/components/ui";

export default function HostEntry() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch("/api/sessions", { method: "POST" })
      .then((r) => r.json())
      .then((d) => router.replace(`/host/${d.code}`))
      .catch(() => router.replace("/"));
  }, [router]);

  return (
    <Stage act={0}>
      <main className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-4">
          <Wordmark size="text-4xl" />
          <p className="pulse-soft text-white/60">Preparando a sala...</p>
        </div>
      </main>
    </Stage>
  );
}
