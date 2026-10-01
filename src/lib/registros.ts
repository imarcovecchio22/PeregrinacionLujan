import "server-only";
import { z } from "zod";
import { registrosPlanificados } from "@/domain/recorrido";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import { registroApi } from "./mi-puesto";
import type { RespuestaGuardar } from "./tipos-api";

export class ErrorDominio extends Error {
  constructor(
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}

export const esquemaRegistro = z.object({
  caminanteId: z.string().min(1),
  puestoId: z.string().min(1),
  tipo: z.enum(["INGRESO", "SALIDA"]),
  hora: z.iso.datetime({ offset: true }),
  cargadoPor: z.string().trim().max(80).nullable().optional(),
});

/**
 * Crea o actualiza un registro. Idempotente: el id lo genera el cliente, así que
 * reintentar el mismo pedido no duplica nada.
 * Si otra persona ya registró al mismo caminante/puesto/tipo, se conserva ese registro
 * y se devuelve con `yaExistia: true`.
 */
export async function guardarRegistro(id: string, datos: z.infer<typeof esquemaRegistro>): Promise<RespuestaGuardar> {
  const caminante = await prisma.caminante.findUnique({
    where: { id: datos.caminanteId },
    include: { peregrinacion: { include: { puestos: true } } },
  });
  if (!caminante) throw new ErrorDominio("El caminante no existe.", 404);
  const puestos = caminante.peregrinacion.puestos;
  const puesto = puestos.find((p) => p.id === datos.puestoId);
  if (!puesto) throw new ErrorDominio("El puesto no corresponde a esta peregrinación.", 404);
  if (!registrosPlanificados(caminante, puesto, puestos).includes(datos.tipo)) {
    const partida = puestos.find((p) => p.id === caminante.puntoPartidaId)?.nombre;
    throw new ErrorDominio(
      `#${caminante.numero} no tiene ${datos.tipo === "INGRESO" ? "Ingreso" : "Salida"} en ${puesto.nombre} (sale desde ${partida}).`,
    );
  }

  const clave = { caminanteId: datos.caminanteId, puestoId: datos.puestoId, tipo: datos.tipo };
  const buscarExistente = () => prisma.registro.findUnique({ where: { caminanteId_puestoId_tipo: clave } });

  const existente = await buscarExistente();
  if (existente && existente.id !== id) return { registro: registroApi(existente), yaExistia: true };

  const hora = new Date(datos.hora);
  const cargadoPor = datos.cargadoPor || null;
  if (existente) {
    const r = await prisma.registro.update({ where: { id }, data: { hora, cargadoPor } });
    return { registro: registroApi(r), yaExistia: false };
  }
  try {
    const r = await prisma.registro.create({ data: { id, ...clave, hora, cargadoPor } });
    return { registro: registroApi(r), yaExistia: false };
  } catch (e) {
    // Dos dispositivos cargaron lo mismo a la vez: gana el primero.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const ganador = await buscarExistente();
      if (ganador) return { registro: registroApi(ganador), yaExistia: ganador.id !== id };
    }
    throw e;
  }
}

/** Borra un registro. Idempotente: borrar algo que ya no existe no es error. */
export async function borrarRegistro(id: string) {
  await prisma.registro.deleteMany({ where: { id } });
}

/** Marca (o quita, con null) el abandono "después del puesto X". Idempotente. */
export async function guardarAbandono(caminanteId: string, puestoId: string | null) {
  const caminante = await prisma.caminante.findUnique({
    where: { id: caminanteId },
    include: { puntoPartida: true, peregrinacion: { include: { puestos: true } } },
  });
  if (!caminante) throw new ErrorDominio("El caminante no existe.", 404);
  if (puestoId) {
    const puesto = caminante.peregrinacion.puestos.find((p) => p.id === puestoId);
    if (!puesto || puesto.orden < caminante.puntoPartida.orden) {
      throw new ErrorDominio("Ese puesto está antes de su punto de partida.");
    }
  }
  if (caminante.abandonoTrasPuestoId === puestoId) return; // ya estaba así (reintento)
  await prisma.caminante.update({
    where: { id: caminanteId },
    data: { abandonoTrasPuestoId: puestoId, abandonoHora: puestoId ? new Date() : null },
  });
}
