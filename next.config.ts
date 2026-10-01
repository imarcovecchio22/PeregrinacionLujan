import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Versión visible en la app (commit en Vercel) para saber si un celular quedó desactualizado.
  env: { NEXT_PUBLIC_VERSION: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7) },
  experimental: {
    // Importación de la planilla (src/app/admin/importar): mismo máximo que valida la acción.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
