// Resumen de la peregrinación (equivale a la hoja "Resumen y control" de la planilla).

import { estadoPuesto, pasanPorPuesto, type EstadoPuesto } from "./recorrido";
import type { CaminanteDom, PuestoDom, RegistroDom, Transporte } from "./tipos";

export interface ConteoTransporte {
  micro: number;
  porSuCuenta: number;
  sinDato: number;
}

export interface Resumen {
  personas: number;
  /** Cantidad que parte de cada puesto de partida. Clave: id del puesto. */
  salenDesde: Record<string, number>;
  /** Transporte de ida, solo entre quienes parten del primer puesto (Liniers). */
  ida: ConteoTransporte;
  vuelta: ConteoTransporte;
  /** Plan: personas que pasan por cada puesto (la partida no cuenta). */
  pasanPorPuesto: Record<string, number>;
  /** En tiempo real, por puesto. */
  estadoPorPuesto: EstadoPuesto[];
  abandonos: number;
}

function contarTransporte(valores: (Transporte | null)[]): ConteoTransporte {
  return {
    micro: valores.filter((v) => v === "MICRO").length,
    porSuCuenta: valores.filter((v) => v === "POR_SU_CUENTA").length,
    sinDato: valores.filter((v) => v === null).length,
  };
}

export function calcularResumen(
  caminantes: CaminanteDom[],
  puestos: PuestoDom[],
  registros: RegistroDom[] = [],
): Resumen {
  const ordenados = [...puestos].sort((a, b) => a.orden - b.orden);
  const primero = ordenados[0];

  const salenDesde: Record<string, number> = {};
  for (const p of ordenados.filter((p) => p.esPartidaPosible)) {
    salenDesde[p.id] = caminantes.filter((c) => c.puntoPartidaId === p.id).length;
  }

  return {
    personas: caminantes.length,
    salenDesde,
    ida: contarTransporte(
      caminantes.filter((c) => c.puntoPartidaId === primero?.id).map((c) => c.transporteIda),
    ),
    vuelta: contarTransporte(caminantes.map((c) => c.transporteVuelta)),
    pasanPorPuesto: pasanPorPuesto(caminantes, ordenados),
    estadoPorPuesto: ordenados.map((p) => estadoPuesto(p, caminantes, ordenados, registros)),
    abandonos: caminantes.filter((c) => c.abandonoTrasPuestoId).length,
  };
}
