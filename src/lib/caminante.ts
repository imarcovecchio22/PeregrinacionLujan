import "server-only";
import { prisma } from "./db";
import { registroApi } from "./mi-puesto";

export async function cargarFicha(id: string) {
  const c = await prisma.caminante.findUnique({
    where: { id },
    include: {
      registros: { orderBy: { hora: "asc" } },
      abordajes: true,
      peregrinacion: { include: { puestos: { orderBy: { orden: "asc" } } } },
    },
  });
  if (!c) return null;
  const { registros, peregrinacion, abordajes, ...caminante } = c;
  const puestos = peregrinacion.puestos.map(({ id, orden, nombre, esPartidaPosible, registraIngreso, registraSalida }) => ({
    id,
    orden,
    nombre,
    esPartidaPosible,
    registraIngreso,
    registraSalida,
  }));
  return { caminante, puestos, registros: registros.map(registroApi), registrosDom: registros, abordajes };
}

export async function siguienteNumero(peregrinacionId: string) {
  const max = await prisma.caminante.aggregate({ where: { peregrinacionId }, _max: { numero: true } });
  return (max._max.numero ?? 0) + 1;
}
