import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// En `next dev` expone los bindings de Cloudflare (D1, vars) vía getCloudflareContext.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // Prisma trae una versión específica para Workers; así entra completa al build (guía de OpenNext).
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  images: {
    // Las fotos ya vienen optimizadas de Freetour; en Workers no usamos el optimizador de Next.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.freetour.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
  },
};

export default nextConfig;
