import "server-only";
import {
  describirPosicion,
  inconsistencias,
  posicionActual,
  registrosPlanificados,
  registrosVigentes,
  type Posicion,
} from "@/domain/recorrido";
import { estadoMicro, type EstadoMicro } from "@/domain/micros";
import { calcularResumen, type Resumen } from "@/domain/resumen";
import type { PuestoDom, TipoRegistro } from "@/domain/tipos";
import { prisma } from "./db";

export interface CeldaTablero {
  planificados: TipoRegistro[];
  vigentes: TipoRegistro[];
  /** ISO por tipo, si está registrado. */
  horas: Partial<Record<TipoRegistro, string>>;
}

export interface FilaTablero {
  id: string;
  numero: number;
  nombreCompleto: string;
  dni: string | null;
  telefonos: string[];
  puntoPartidaId: string;
  celdas: Record<string, CeldaTablero>;
  posicion: Posicion;
  /** Clave para agrupar/filtrar por posición, ej. "EN_PUESTO:<id>". */
  clavePosicion: string;
  textoPosicion: string;
  inconsistencias: string[];
}

export interface GrupoPosicion {
  clave: string;
  texto: string;
  cantidad: number;
}

export interface DatosTablero {
  nombre: string;
  puestos: PuestoDom[];
  resumen: Resumen;
  filas: FilaTablero[];
  posiciones: GrupoPosicion[];
  micros: { IDA: EstadoMicro; VUELTA: EstadoMicro };
  generado: string;
}

export function clavePosicion(p: Posicion): string {
  return p.tipo === "CAMINANDO" ? `CAMINANDO:${p.desdeId}` : `${p.tipo}:${p.puestoId}`;
}

export async function cargarTablero(): Promise<DatosTablero | null> {
  const peregrinacion = await prisma.peregrinacion.findFirst({
    where: { activa: true },
    include: {
      puestos: { orderBy: { orden: "asc" } },
      caminantes: { orderBy: { numero: "asc" } },
    },
  });
  if (!peregrinacion) return null;
  const puestos: PuestoDom[] = peregrinacion.puestos.map(
    ({ id, orden, nombre, esPartidaPosible, registraIngreso, registraSalida }) => ({
      id,
      orden,
      nombre,
      esPartidaPosible,
      registraIngreso,
      registraSalida,
    }),
  );
  const registros = await prisma.registro.findMany({ where: { caminante: { peregrinacionId: peregrinacion.id } } });
  const abordajes = await prisma.abordaje.findMany({
    where: { caminante: { peregrinacionId: peregrinacion.id } },
    select: { caminanteId: true, tramo: true },
  });
  const subieron = (tramo: "IDA" | "VUELTA") =>
    new Set(abordajes.filter((a) => a.tramo === tramo).map((a) => a.caminanteId));
  const porCaminante = Map.groupBy(registros, (r) => r.caminanteId);

  const filas = peregrinacion.caminantes.map((c): FilaTablero => {
    const propios = porCaminante.get(c.id) ?? [];
    const celdas: Record<string, CeldaTablero> = {};
    for (const p of puestos) {
      const horas: CeldaTablero["horas"] = {};
      for (const r of propios.filter((r) => r.puestoId === p.id)) horas[r.tipo] = r.hora.toISOString();
      celdas[p.id] = {
        planificados: registrosPlanificados(c, p, puestos),
        vigentes: registrosVigentes(c, p, puestos),
        horas,
      };
    }
    const posicion = posicionActual(c, puestos, propios);
    return {
      id: c.id,
      numero: c.numero,
      nombreCompleto: c.nombreCompleto,
      dni: c.dni,
      telefonos: c.telefonos,
      puntoPartidaId: c.puntoPartidaId,
      celdas,
      posicion,
      clavePosicion: clavePosicion(posicion),
      textoPosicion: describirPosicion(posicion, puestos),
      inconsistencias: inconsistencias(c, puestos, propios),
    };
  });

  // Grupos de posición en orden de recorrido: sin salir, en puesto / caminando, llegaron, abandonos.
  const ordenTipo = { SIN_SALIR: 0, EN_PUESTO: 1, CAMINANDO: 1, LLEGO: 3, ABANDONO: 4 } as const;
  const ordenPuesto = (p: Posicion) =>
    puestos.find((x) => x.id === (p.tipo === "CAMINANDO" ? p.desdeId : p.puestoId))?.orden ?? 0;
  const grupos = new Map<string, GrupoPosicion & { orden: number }>();
  for (const f of filas) {
    const g = grupos.get(f.clavePosicion);
    if (g) g.cantidad++;
    else {
      const orden =
        ordenTipo[f.posicion.tipo] * 100 + ordenPuesto(f.posicion) * 2 + (f.posicion.tipo === "CAMINANDO" ? 1 : 0);
      grupos.set(f.clavePosicion, { clave: f.clavePosicion, texto: f.textoPosicion, cantidad: 1, orden });
    }
  }

  return {
    nombre: peregrinacion.nombre,
    puestos,
    resumen: calcularResumen(peregrinacion.caminantes, puestos, registros),
    filas,
    posiciones: [...grupos.values()]
      .sort((a, b) => a.orden - b.orden)
      .map((g) => ({ clave: g.clave, texto: g.texto, cantidad: g.cantidad })),
    micros: {
      IDA: estadoMicro(peregrinacion.caminantes, "IDA", puestos, subieron("IDA")),
      VUELTA: estadoMicro(peregrinacion.caminantes, "VUELTA", puestos, subieron("VUELTA")),
    },
    generado: new Date().toISOString(),
  };
}
