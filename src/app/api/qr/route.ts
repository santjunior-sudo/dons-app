import QRCode from "qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Gera o QR Code da sala como SVG (sem dependência de rede). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const data = url.searchParams.get("data");
  if (!data) return new Response("missing data", { status: 400 });

  const svg = await QRCode.toString(data, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#0B1020", light: "#FFFFFF" },
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
