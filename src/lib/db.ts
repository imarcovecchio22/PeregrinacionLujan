import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Una sola instancia por proceso (en dev, Next recarga módulos y abriría conexiones de más).
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

function crearCliente() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalParaPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = prisma;
