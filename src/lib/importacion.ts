import "server-only";
import { asignarFechas, leerListado, type Aviso, type ErrorImportacion } from "@/domain/importar";
import { PUESTOS_DEFAULT } from "@/domain/puestos-default";
import { calcularResumen } from "@/domain/resumen";
import { TEXTO_TRANSPORTE } from "@/domain/planilla";
import type { PuestoDom } from "@/domain/tipos";
import { prisma } from "./db";
import { leerMatriz } from "./excel-leer";

export type Destino = "NUEVA" | "REEMPLAZAR";

export interface OpcionesImportacion {
  destino: Destino;
  /** Solo para NUEVA. */
  nombre: string;
  /** "YYYY-MM-DD", solo para NUEVA. */
  fechaInicio: string;
  /** "HH:mm": la primera hora de un caminante anterior a esta es del día siguiente. */
  corte: string;
}

export interface FilaPrevia {
  fila: number;
  numero: number;
  nombreCompleto: string;
  dni: string | null;
  partida: string;
  telefonos: string[];
  ida: string;
  vuelta: string;
  horas: number;
}

export interface Previsualizacion {
  destinoTexto: string;
  personas: number;
  salenDesde: { nombre: string; cantidad: number }[];
  ida: { puesto: string; micro: number; porSuCuenta: number; sinDato: number };
  vuelta: { puesto: string; micro: number; porSuCuenta: number; sinDato: number };
  pasan: { nombre: string; cantidad: number }[];
  horas: number;
  filas: FilaPrevia[];
  avisos: Aviso[];
  errores: ErrorImportacion[];
  /** Lo que se va a borrar si el destino es REEMPLAZAR. */
  aBorrar: { caminantes: number; registros: number } | null;
}

/** Puestos contra los que se lee la planilla: los de la peregrinación activa, o los default. */
async function puestosPlantilla(): Promise<{ activa: { id: string; nombre: string; fechaInicio: Date } | null; puestos: PuestoDom[] }> {
  const activa = await prisma.peregrinacion.findFirst({ where: { activa: true }, include: { puestos: { orderBy: { orden: "asc" } } } });
  if (activa) return { activa, puestos: activa.puestos };
  return { activa: null, puestos: PUESTOS_DEFAULT.map((p) => ({ ...p, id: `default-${p.orden}` })) };
}

async function leer(archivo: File) {
  const { activa, puestos } = await puestosPlantilla();
  const lectura = leerListado(await leerMatriz(archivo), puestos);
  return { activa, puestos, lectura };
}

export async function previsualizar(archivo: File, op: OpcionesImportacion): Promise<Previsualizacion> {
  const { activa, puestos, lectura } = await leer(archivo);
  if (op.destino === "REEMPLAZAR" && !activa) throw new Error("No hay peregrinación activa para reemplazar.");
  const r = calcularResumen(
    lectura.filas.map((f) => ({ ...f, id: String(f.fila), abandonoTrasPuestoId: null })),
    puestos,
  );
  const nombre = (id: string) => puestos.find((p) => p.id === id)?.nombre ?? "?";
  const txt = (t: keyof typeof TEXTO_TRANSPORTE | null) => (t ? TEXTO_TRANSPORTE[t] : "—");
  const aBorrar =
    op.destino === "REEMPLAZAR" && activa
      ? {
          caminantes: await prisma.caminante.count({ where: { peregrinacionId: activa.id } }),
          registros: await prisma.registro.count({ where: { caminante: { peregrinacionId: activa.id } } }),
        }
      : null;

  return {
    destinoTexto:
      op.destino === "NUEVA" ? `nueva peregrinación «${op.nombre}» (pasa a ser la activa)` : `«${activa!.nombre}» (se reemplazan sus caminantes)`,
    personas: r.personas,
    salenDesde: Object.entries(r.salenDesde).map(([id, cantidad]) => ({ nombre: nombre(id), cantidad })),
    ida: { puesto: puestos[0].nombre, ...r.ida },
    vuelta: { puesto: puestos[puestos.length - 1].nombre, ...r.vuelta },
    pasan: puestos.slice(1).map((p) => ({ nombre: `${p.orden}. ${p.nombre}`, cantidad: r.pasanPorPuesto[p.id] })),
    horas: lectura.filas.reduce((s, f) => s + f.registros.length, 0),
    filas: lectura.filas.map((f) => ({
      fila: f.fila,
      numero: f.numero,
      nombreCompleto: f.nombreCompleto,
      dni: f.dni,
      partida: nombre(f.puntoPartidaId),
      telefonos: f.telefonos,
      ida: f.puntoPartidaId === puestos[0].id ? txt(f.transporteIda) : "NA",
      vuelta: txt(f.transporteVuelta),
      horas: f.registros.length,
    })),
    avisos: lectura.avisos,
    errores: lectura.errores,
    aBorrar,
  };
}

/** Importa las filas válidas (las filas con error se omiten) en una sola transacción. */
export async function importar(archivo: File, op: OpcionesImportacion) {
  const { activa, puestos, lectura } = await leer(archivo);
  if (lectura.filas.length === 0) throw new Error("No hay filas válidas para importar.");

  return prisma.$transaction(
    async (tx) => {
      let peregrinacionId: string;
      let fechaInicio: string;
      let idPorOrden: Map<number, string>;

      if (op.destino === "NUEVA") {
        await tx.peregrinacion.updateMany({ data: { activa: false } });
        const nueva = await tx.peregrinacion.create({
          data: {
            nombre: op.nombre,
            fechaInicio: new Date(op.fechaInicio),
            activa: true,
            puestos: {
              create: puestos.map(({ orden, nombre, esPartidaPosible, registraIngreso, registraSalida }) => ({
                orden,
                nombre,
                esPartidaPosible,
                registraIngreso,
                registraSalida,
              })),
            },
          },
          include: { puestos: true },
        });
        peregrinacionId = nueva.id;
        fechaInicio = op.fechaInicio;
        idPorOrden = new Map(nueva.puestos.map((p) => [p.orden, p.id]));
      } else {
        if (!activa) throw new Error("No hay peregrinación activa para reemplazar.");
        await tx.caminante.deleteMany({ where: { peregrinacionId: activa.id } });
        peregrinacionId = activa.id;
        fechaInicio = activa.fechaInicio.toISOString().slice(0, 10);
        idPorOrden = new Map(puestos.map((p) => [p.orden, p.id]));
      }
      // Los ids de la lectura son los de la plantilla; se traducen por orden.
      const traducir = (id: string) => idPorOrden.get(puestos.find((p) => p.id === id)!.orden)!;

      await tx.caminante.createMany({
        data: lectura.filas.map((f) => ({
          peregrinacionId,
          numero: f.numero,
          nombreCompleto: f.nombreCompleto,
          dni: f.dni,
          telefonos: f.telefonos,
          puntoPartidaId: traducir(f.puntoPartidaId),
          transporteIda: f.transporteIda,
          transporteVuelta: f.transporteVuelta,
        })),
      });
      const creados = await tx.caminante.findMany({ where: { peregrinacionId }, select: { id: true, numero: true } });
      const idPorNumero = new Map(creados.map((c) => [c.numero, c.id]));

      const registros = lectura.filas.flatMap((f) =>
        asignarFechas(f.registros, puestos, fechaInicio, op.corte).map((r) => ({
          id: crypto.randomUUID(),
          caminanteId: idPorNumero.get(f.numero)!,
          puestoId: traducir(r.puestoId),
          tipo: r.tipo,
          hora: r.hora,
          cargadoPor: "Importación",
        })),
      );
      if (registros.length > 0) await tx.registro.createMany({ data: registros });
      return { peregrinacionId, caminantes: lectura.filas.length, registros: registros.length, omitidas: lectura.errores.length };
    },
    { timeout: 30_000 },
  );
}
