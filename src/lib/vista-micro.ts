// Lógica pura de la pantalla de micro: agrupar faltantes primero y buscar.

import type { Tramo } from "@/domain/micros";
import type { FilaMicro } from "./tipos-api";
import { coincideCaminante } from "./vista-puesto";

export type GrupoMicro = "SIN_GUARDAR" | "FALTAN" | "EXTRAS" | "SUBIERON";
export const ORDEN_GRUPOS_MICRO: GrupoMicro[] = ["SIN_GUARDAR", "FALTAN", "EXTRAS", "SUBIERON"];

/**
 * Grupo "natural" de una fila; las no anotadas que no subieron no se listan (null).
 * Sin `conExtras` (check-in), las de otro turno tampoco se listan aunque hayan llegado.
 */
export function grupoMicro(f: FilaMicro, conExtras = true): GrupoMicro | null {
  if (f.esperado) return f.abordaje ? "SUBIERON" : "FALTAN";
  return f.abordaje && conExtras ? "EXTRAS" : null;
}

/**
 * Agrupa las filas que coinciden con la búsqueda. Las que tienen error van arriba y las que
 * se están guardando quedan fijas donde estaban (`fijas`), como en "Mi puesto".
 */
export function agruparMicro(
  filas: FilaMicro[],
  busqueda: string,
  conError: Set<string> = new Set(),
  fijas: Map<string, GrupoMicro> = new Map(),
  conExtras = true,
): { grupos: Record<GrupoMicro, FilaMicro[]>; noAnotados: FilaMicro[] } {
  const grupos: Record<GrupoMicro, FilaMicro[]> = { SIN_GUARDAR: [], FALTAN: [], EXTRAS: [], SUBIERON: [] };
  const noAnotados: FilaMicro[] = [];
  for (const f of filas) {
    if (!coincideCaminante(f.caminante, busqueda)) continue;
    const id = f.caminante.id;
    const g = conError.has(id) ? "SIN_GUARDAR" : (fijas.get(id) ?? grupoMicro(f, conExtras));
    if (g) grupos[g].push(f);
    else if (busqueda.trim()) noAnotados.push(f);
  }
  return { grupos, noAnotados };
}

/** Textos de la pantalla según el tramo (el check-in usa la misma pantalla que los micros). */
export interface TextosTramo {
  icono: string;
  hecho: string;
  faltan: string;
  hicieron: string;
  extras: string;
  noAnotado: string;
  etiquetaNoAnotado: string;
  hacerIgual: string;
  /** Marcar a quienes van por su cuenta (en el check-in están todos). */
  marcarPorSuCuenta: boolean;
}

export function textosTramo(tramo: Tramo): TextosTramo {
  if (tramo === "CHECKIN") {
    return {
      icono: "📋",
      hecho: "Llegó",
      faltan: "Faltan llegar",
      hicieron: "Llegaron",
      extras: "Llegaron de otro turno",
      noAnotado: "Es de otro turno:",
      etiquetaNoAnotado: "Otro turno",
      hacerIgual: "Llegó igual (es de otro turno)",
      marcarPorSuCuenta: true,
    };
  }
  return {
    icono: "🚌",
    hecho: "Subió",
    faltan: "Faltan subir",
    hicieron: "Subieron",
    extras: "Subieron sin estar anotados",
    noAnotado: "No está anotado para este micro:",
    etiquetaNoAnotado: "No anotado",
    hacerIgual: "Subió igual (no estaba anotado)",
    marcarPorSuCuenta: false,
  };
}

/**
 * Check-in: se muestra un turno por vez. Los del turno elegido son los "esperados"; los de
 * otros turnos aparecen al buscarlos (y si llegaron, como "de otro turno").
 */
export function filasDelTurno(filas: FilaMicro[], turno: string | null): FilaMicro[] {
  return filas.map((f) =>
    f.turno === turno
      ? { ...f, esperado: true, motivo: null }
      : { ...f, esperado: false, motivo: `${f.turno ?? "sin horario"}, sale desde ${f.partida}` },
  );
}
