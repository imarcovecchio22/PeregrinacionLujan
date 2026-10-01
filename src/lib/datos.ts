import "server-only";
import { prisma } from "./db";

/** Peregrinación activa con todo lo necesario para calcular estados (161 personas: cabe en memoria). */
export async function cargarPeregrinacionActiva() {
  return prisma.peregrinacion.findFirst({
    where: { activa: true },
    include: {
      puestos: { orderBy: { orden: "asc" } },
      caminantes: { orderBy: { numero: "asc" } },
    },
  });
}

export async function cargarRegistros(peregrinacionId: string) {
  return prisma.registro.findMany({ where: { caminante: { peregrinacionId } } });
}
