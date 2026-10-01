// Estructura de la hoja "Listado" de la planilla. Es la misma para importar y exportar,
// y se deriva de los puestos (nada hardcodeado a 2026).
//
// N° | Apellido y nombre | DNI | Teléfono | Sale desde | Ida a <puesto 0> |
// <1. puesto> Ingreso/Salida | ... | <último> Ingreso | Vuelta desde <último>
//
// El primer puesto no tiene columnas de hora: en la planilla se representa con "Ida a".

import type { PuestoDom, TipoRegistro } from "./tipos";

export const NA = "NA";
export const FILA_ENCABEZADO = 4; // 1-based, como en Excel
export const FILA_PRIMER_DATO = 6;

export type Columna =
  | { tipo: "numero" | "nombre" | "dni" | "telefono" | "partida" | "ida" | "vuelta"; titulo: string }
  | { tipo: "registro"; titulo: string; subtitulo: "Ingreso" | "Salida"; puestoId: string; registro: TipoRegistro };

export function tituloPuesto(p: PuestoDom) {
  return `${p.orden}. ${p.nombre}`;
}

export function columnasPlanilla(puestos: PuestoDom[]): Columna[] {
  const ordenados = [...puestos].sort((a, b) => a.orden - b.orden);
  const primero = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  const cols: Columna[] = [
    { tipo: "numero", titulo: "N°" },
    { tipo: "nombre", titulo: "Apellido y nombre" },
    { tipo: "dni", titulo: "DNI" },
    { tipo: "telefono", titulo: "Teléfono" },
    { tipo: "partida", titulo: "Sale desde" },
    { tipo: "ida", titulo: `Ida a ${primero.nombre}` },
  ];
  for (const p of ordenados.slice(1)) {
    if (p.registraIngreso) {
      cols.push({ tipo: "registro", titulo: tituloPuesto(p), subtitulo: "Ingreso", puestoId: p.id, registro: "INGRESO" });
    }
    if (p.registraSalida) {
      cols.push({ tipo: "registro", titulo: tituloPuesto(p), subtitulo: "Salida", puestoId: p.id, registro: "SALIDA" });
    }
  }
  cols.push({ tipo: "vuelta", titulo: `Vuelta desde ${ultimo.nombre}` });
  return cols;
}

/** "A", "B", ..., "Z", "AA"... (índice 0-based). */
export function letraColumna(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

export const TEXTO_TRANSPORTE = { MICRO: "Micro", POR_SU_CUENTA: "Por su cuenta" } as const;
