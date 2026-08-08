import { getSession, subscribe } from "@/lib/gameStore";
import type { Snapshot } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const session = getSession(code);
  if (!session) {
    return new Response("Sala não encontrada.", { status: 404 });
  }
  const playerId = new URL(req.url).searchParams.get("playerId");

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepAlive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const push = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      // Alguns proxies só liberam a resposta depois de um bloco inicial.
      push(`:${" ".repeat(2048)}\n\n`);
      push(`retry: 2000\n\n`);

      unsubscribe = subscribe(session, playerId, (snapshot: Snapshot) => {
        push(`event: state\ndata: ${JSON.stringify(snapshot)}\n\n`);
      });

      // Mantém a conexão viva atrás de proxies e detecta clientes mortos.
      keepAlive = setInterval(() => push(`: ping\n\n`), 15000);

      const abort = () => {
        closed = true;
        if (keepAlive) clearInterval(keepAlive);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          /* já fechado */
        }
      };
      req.signal.addEventListener("abort", abort);
    },
    cancel() {
      if (keepAlive) clearInterval(keepAlive);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
