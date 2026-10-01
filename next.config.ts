import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Importación de la planilla (src/app/admin/importar): mismo máximo que valida la acción.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
