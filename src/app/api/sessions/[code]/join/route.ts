import { NextResponse } from "next/server";
import { joinSession, playerCookieName, snapshotFor } from "@/lib/gameStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const contentType = req.headers.get("content-type") ?? "";
  const isForm =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  let name = "";
  let playerId: string | null = null;
  if (isForm) {
    const form = await req.formData();
    name = String(form.get("name") ?? "");
    playerId = (form.get("playerId") as string) || null;
  } else {
    const body = await req.json().catch(() => ({}));
    name = body?.name ?? "";
    playerId = body?.playerId ?? null;
  }

  const result = joinSession(code, name, playerId);

  // Envio nativo do formulário (celular sem JS ativo): grava o jogador em cookie
  // e devolve um redirect — a entrada nunca depende de JavaScript.
  if (isForm) {
    // Location relativo: atrás de proxy/túnel, `req.url` aponta para o host
    // interno e um redirect absoluto jogaria o celular em localhost.
    if ("error" in result) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: `/join/${code.toUpperCase()}?erro=${encodeURIComponent(result.error)}`,
        },
      });
    }
    const cookie = `${playerCookieName(result.session.code)}=${result.player.id}; Path=/; Max-Age=${60 * 60 * 8}; SameSite=Lax`;
    return new Response(null, {
      status: 303,
      headers: {
        Location: `/play/${result.session.code}`,
        "Set-Cookie": cookie,
      },
    });
  }

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    playerId: result.player.id,
    name: result.player.name,
    code: result.session.code,
    snapshot: snapshotFor(result.session, result.player.id),
  });
}
