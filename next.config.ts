import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagem enxuta para deploy em container (Railway/Render/Fly).
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
