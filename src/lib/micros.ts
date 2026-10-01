import "server-only";
import { z } from "zod";
import { esperadoEnMicro, motivoNoEsperado, type Tramo } from "@/domain/micros";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import { ErrorDominio } from "./registros";
import type { AbordajeApi, DatosMicro, RespuestaAbordaje } from "./tipos-api";

function abordajeApi(a: { id: string; caminanteId: string; tramo: Tramo; hora: Date; cargadoPor: string | null }): AbordajeApi {
  return { id: a.id, caminanteId: a.caminanteId, tramo: a.tramo, hora: a.hora.toISOString(), cargadoPor: a.cargadoPor };
}

/** Todos los caminantes de la peregrinación activa, marcando quién está anotado para el micro. */
export async function cargarDatosMicro(tramo: Tramo): Promise<DatosMicro | null> {
  const p = await prisma.peregrinacion.findFirst({
    where: { activa: true },
    include: {
      puestos: { orderBy: { orden: "asc" } },
      caminantes: { orderBy: { numero: "asc" }, include: { abordajes: { where: { tramo } } } },
    },
  });
  if (!p) return null;
  return {
    tramo,
    peregrinacionId: p.id,
    filas: p.caminantes.map((c) => {
      const esperado = esperadoEnMicro(c, tramo, p.puestos);
      return {
        caminante: {
          id: c.id,
          numero: c.numero,
          nombreCompleto: c.nombreCompleto,
          telefonos: c.telefonos,
          dni: c.dni,
          notas: c.notas,
          puntoPartidaId: c.puntoPartidaId,
          abandonoTrasPuestoId: c.abandonoTrasPuestoId,
          transporteIda: c.transporteIda,
          transporteVuelta: c.transporteVuelta,
        },
        partida: p.puestos.find((x) => x.id === c.puntoPartidaId)?.nombre ?? "?",
        esperado,
        motivo: esperado ? null : motivoNoEsperado(c, tramo, p.puestos),
        abordaje: c.abordajes[0] ? abordajeApi(c.abordajes[0]) : null,
      };
    }),
    generado: new Date().toISOString(),
  };
}

export const esquemaAbordaje = z.object({
  caminanteId: z.string().min(1),
  tramo: z.enum(["IDA", "VUELTA"]),
  hora: z.iso.datetime({ offset: true }),
  cargadoPor: z.string().trim().max(80).nullable().optional(),
});

/** Marca que subió. Idempotente; si otro celular ya lo marcó, se conserva ese (yaExistia). */
export async function guardarAbordaje(id: string, d: z.infer<typeof esquemaAbordaje>): Promise<RespuestaAbordaje> {
  const caminante = await prisma.caminante.findUnique({ where: { id: d.caminanteId } });
  if (!caminante) throw new ErrorDominio("El caminante no existe.", 404);
  const clave = { caminanteId: d.caminanteId, tramo: d.tramo };
  const buscar = () => prisma.abordaje.findUnique({ where: { caminanteId_tramo: clave } });
  const existente = await buscar();
  if (existente && existente.id !== id) return { abordaje: abordajeApi(existente), yaExistia: true };
  const data = { hora: new Date(d.hora), cargadoPor: d.cargadoPor || null };
  if (existente) return { abordaje: abordajeApi(await prisma.abordaje.update({ where: { id }, data })), yaExistia: false };
  try {
    return { abordaje: abordajeApi(await prisma.abordaje.create({ data: { id, ...clave, ...data } })), yaExistia: false };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const ganador = await buscar();
      if (ganador) return { abordaje: abordajeApi(ganador), yaExistia: ganador.id !== id };
    }
    throw e;
  }
}

export async function borrarAbordaje(id: string) {
  await prisma.abordaje.deleteMany({ where: { id } });
}
