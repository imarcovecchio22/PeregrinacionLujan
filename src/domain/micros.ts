// Control de micros: solo "subió / no subió" por tramo (no se asignan vehículos).
// - Ida (parroquia → primer puesto): quienes parten del primer puesto con ida "Micro".
// - Vuelta (desde el último puesto): quienes vuelven en "Micro", salvo los que abandonaron.
// Si sube alguien no anotado, se registra igual y se lo muestra aparte ("extra").

import type { CaminanteDom, PuestoDom } from "./tipos";

export type Tramo = "IDA" | "VUELTA";

export const TRAMOS: Tramo[] = ["IDA", "VUELTA"];

export function esperadoEnMicro(c: CaminanteDom, tramo: Tramo, puestos: PuestoDom[]): boolean {
  if (tramo === "IDA") {
    const primero = [...puestos].sort((a, b) => a.orden - b.orden)[0];
    return c.puntoPartidaId === primero?.id && c.transporteIda === "MICRO";
  }
  return c.transporteVuelta === "MICRO" && !c.abandonoTrasPuestoId;
}

/** Por qué alguien no está anotado para el micro (para mostrar al buscarlo). */
export function motivoNoEsperado(c: CaminanteDom, tramo: Tramo, puestos: PuestoDom[]): string {
  const ordenados = [...puestos].sort((a, b) => a.orden - b.orden);
  if (tramo === "IDA") {
    if (c.puntoPartidaId !== ordenados[0]?.id) {
      return `sale desde ${puestos.find((p) => p.id === c.puntoPartidaId)?.nombre ?? "otro puesto"}`;
    }
    return c.transporteIda === "POR_SU_CUENTA" ? "va por su cuenta" : "sin dato de ida";
  }
  if (c.abandonoTrasPuestoId) return `abandonó tras ${puestos.find((p) => p.id === c.abandonoTrasPuestoId)?.nombre ?? "?"}`;
  return c.transporteVuelta === "POR_SU_CUENTA" ? "vuelve por su cuenta" : "sin dato de vuelta";
}

export interface EstadoMicro {
  esperados: number;
  /** Subieron, entre los esperados. */
  subieron: number;
  faltan: number;
  /** Subieron sin estar anotados para este micro. */
  extras: number;
}

export function estadoMicro(
  caminantes: CaminanteDom[],
  tramo: Tramo,
  puestos: PuestoDom[],
  subieronIds: Set<string>,
): EstadoMicro {
  let esperados = 0;
  let subieron = 0;
  let extras = 0;
  for (const c of caminantes) {
    const esperado = esperadoEnMicro(c, tramo, puestos);
    if (esperado) esperados++;
    if (subieronIds.has(c.id)) {
      if (esperado) subieron++;
      else extras++;
    }
  }
  return { esperados, subieron, faltan: esperados - subieron, extras };
}

export const NOMBRE_TRAMO: Record<Tramo, string> = { IDA: "Micro de ida", VUELTA: "Micro de vuelta" };
