import "server-only";
import { registrosPlanificados } from "@/domain/recorrido";
import { prisma } from "./db";
import type { DatosPuesto, RegistroApi } from "./tipos-api";

export function registroApi(r: {
  id: string;
  caminanteId: string;
  puestoId: string;
  tipo: "INGRESO" | "SALIDA";
  hora: Date;
  cargadoPor: string | null;
}): RegistroApi {
  return {
    id: r.id,
    caminanteId: r.caminanteId,
    puestoId: r.puestoId,
    tipo: r.tipo,
    hora: r.hora.toISOString(),
    cargadoPor: r.cargadoPor,
  };
}

/** Caminantes que tienen algo que registrar en el puesto, con sus registros ahí. */
export async function cargarDatosPuesto(puestoId: string): Promise<DatosPuesto | null> {
  const puesto = await prisma.puesto.findUnique({
    where: { id: puestoId },
    include: {
      peregrinacion: {
        include: {
          puestos: { orderBy: { orden: "asc" } },
          caminantes: { orderBy: { numero: "asc" } },
        },
      },
    },
  });
  if (!puesto) return null;
  const { peregrinacion, ...puestoSolo } = puesto;
  const puestos = peregrinacion.puestos;

  const registros = await prisma.registro.findMany({ where: { puestoId } });
  const porCaminante = new Map<string, RegistroApi[]>();
  for (const r of registros) {
    porCaminante.set(r.caminanteId, [...(porCaminante.get(r.caminanteId) ?? []), registroApi(r)]);
  }

  const filas = peregrinacion.caminantes
    .filter((c) => registrosPlanificados(c, puestoSolo, puestos).length > 0 || porCaminante.has(c.id))
    .map((c) => ({
      caminante: {
        id: c.id,
        numero: c.numero,
        nombreCompleto: c.nombreCompleto,
        telefonos: c.telefonos,
        notas: c.notas,
        puntoPartidaId: c.puntoPartidaId,
        abandonoTrasPuestoId: c.abandonoTrasPuestoId,
        transporteIda: c.transporteIda,
        transporteVuelta: c.transporteVuelta,
      },
      registros: porCaminante.get(c.id) ?? [],
    }));

  return {
    puesto: puestoSolo,
    puestos: puestos.map(({ id, orden, nombre, esPartidaPosible, registraIngreso, registraSalida }) => ({
      id,
      orden,
      nombre,
      esPartidaPosible,
      registraIngreso,
      registraSalida,
    })),
    filas,
    generado: new Date().toISOString(),
  };
}
