// Reglas de paso por puesto. Ver "Reglas de paso por puesto" en CLAUDE.md.
//
// - Puestos anteriores a la partida: no le corresponden (el "NA" de la planilla).
// - Punto de partida: solo SALIDA (se presentó y arrancó). No cuenta como "pasa por".
// - Puestos posteriores: INGRESO y/o SALIDA según los flags del puesto
//   (Luján no registra salida).
// - Abandono "después del puesto X": desde ahí no se espera nada más; la SALIDA de X
//   pasa a ser opcional.

import type { CaminanteDom, PuestoDom, RegistroDom, TipoRegistro } from "./tipos";

export type RolEnPuesto = "NO_CORRESPONDE" | "PARTIDA" | "PASO";

function ordenDe(puestos: PuestoDom[], puestoId: string): number {
  const p = puestos.find((x) => x.id === puestoId);
  if (!p) throw new Error(`Puesto inexistente: ${puestoId}`);
  return p.orden;
}

export function rolEnPuesto(c: CaminanteDom, puesto: PuestoDom, puestos: PuestoDom[]): RolEnPuesto {
  const partida = ordenDe(puestos, c.puntoPartidaId);
  if (puesto.orden < partida) return "NO_CORRESPONDE";
  if (puesto.orden === partida) return "PARTIDA";
  return "PASO";
}

/** ¿El caminante pasa por este puesto? (cuenta para "Pasan por cada puesto"; la partida no). */
export function pasaPorPuesto(c: CaminanteDom, puesto: PuestoDom, puestos: PuestoDom[]): boolean {
  return rolEnPuesto(c, puesto, puestos) === "PASO";
}

/** Registros que le corresponden según el plan, sin considerar abandonos. */
export function registrosPlanificados(c: CaminanteDom, puesto: PuestoDom, puestos: PuestoDom[]): TipoRegistro[] {
  switch (rolEnPuesto(c, puesto, puestos)) {
    case "NO_CORRESPONDE":
      return [];
    case "PARTIDA":
      return ["SALIDA"];
    case "PASO": {
      const tipos: TipoRegistro[] = [];
      if (puesto.registraIngreso) tipos.push("INGRESO");
      if (puesto.registraSalida) tipos.push("SALIDA");
      return tipos;
    }
  }
}

/** Registros que todavía se esperan del caminante, descontando el abandono. */
export function registrosVigentes(c: CaminanteDom, puesto: PuestoDom, puestos: PuestoDom[]): TipoRegistro[] {
  const plan = registrosPlanificados(c, puesto, puestos);
  if (!c.abandonoTrasPuestoId) return plan;
  const abandono = ordenDe(puestos, c.abandonoTrasPuestoId);
  if (puesto.orden > abandono) return [];
  if (puesto.orden === abandono) return plan.filter((t) => t !== "SALIDA");
  return plan;
}

/** Cantidad de personas que pasan por cada puesto (plan). Clave: id del puesto. */
export function pasanPorPuesto(caminantes: CaminanteDom[], puestos: PuestoDom[]): Record<string, number> {
  const res: Record<string, number> = {};
  for (const p of puestos) {
    res[p.id] = caminantes.filter((c) => pasaPorPuesto(c, p, puestos)).length;
  }
  return res;
}

/** Pasos ordenados del recorrido (puesto + tipo) planificados para un caminante. */
export function pasosPlanificados(c: CaminanteDom, puestos: PuestoDom[]) {
  return [...puestos]
    .sort((a, b) => a.orden - b.orden)
    .flatMap((p) => registrosPlanificados(c, p, puestos).map((tipo) => ({ puesto: p, tipo })));
}

export interface EstadoPuesto {
  puestoId: string;
  /** Personas para las que este puesto es relevante (pasan por él o parten de él), según el plan. */
  esperados: number;
  /** Ídem, descontando a quienes abandonaron antes. */
  esperadosVigentes: number;
  esperanIngreso: number;
  ingresaron: number;
  faltanIngresar: number;
  esperanSalida: number;
  salieron: number;
  faltanSalir: number;
  /** Abandonaron después de este puesto. */
  abandonos: number;
}

export function estadoPuesto(
  puesto: PuestoDom,
  caminantes: CaminanteDom[],
  puestos: PuestoDom[],
  registros: RegistroDom[],
): EstadoPuesto {
  const hechos = new Set(
    registros.filter((r) => r.puestoId === puesto.id).map((r) => `${r.caminanteId}:${r.tipo}`),
  );
  const e: EstadoPuesto = {
    puestoId: puesto.id,
    esperados: 0,
    esperadosVigentes: 0,
    esperanIngreso: 0,
    ingresaron: 0,
    faltanIngresar: 0,
    esperanSalida: 0,
    salieron: 0,
    faltanSalir: 0,
    abandonos: 0,
  };
  for (const c of caminantes) {
    if (c.abandonoTrasPuestoId === puesto.id) e.abandonos++;
    if (registrosPlanificados(c, puesto, puestos).length > 0) e.esperados++;
    const vigentes = registrosVigentes(c, puesto, puestos);
    if (vigentes.length > 0) e.esperadosVigentes++;
    for (const tipo of vigentes) {
      const hecho = hechos.has(`${c.id}:${tipo}`);
      if (tipo === "INGRESO") {
        e.esperanIngreso++;
        if (hecho) e.ingresaron++;
      } else {
        e.esperanSalida++;
        if (hecho) e.salieron++;
      }
    }
  }
  e.faltanIngresar = e.esperanIngreso - e.ingresaron;
  e.faltanSalir = e.esperanSalida - e.salieron;
  return e;
}

/**
 * Inconsistencias de carga (no bloquean: solo se marcan en el tablero).
 * - registro en un puesto/tipo que no le corresponde;
 * - falta un paso anterior a uno ya registrado (ej.: Ingreso en Merlo sin Salida de Castelar);
 * - horas que retroceden a lo largo del recorrido.
 */
export function inconsistencias(c: CaminanteDom, puestos: PuestoDom[], registros: RegistroDom[]): string[] {
  const propios = registros.filter((r) => r.caminanteId === c.id);
  const res: string[] = [];
  const nombre = (id: string) => puestos.find((p) => p.id === id)?.nombre ?? "?";
  const txt = (t: TipoRegistro) => (t === "INGRESO" ? "Ingreso" : "Salida");

  for (const r of propios) {
    const p = puestos.find((x) => x.id === r.puestoId);
    if (!p || !registrosPlanificados(c, p, puestos).includes(r.tipo)) {
      res.push(`${txt(r.tipo)} en ${nombre(r.puestoId)}: no le corresponde`);
    }
  }

  const pasos = pasosPlanificados(c, puestos);
  const registro = (puestoId: string, tipo: TipoRegistro) =>
    propios.find((r) => r.puestoId === puestoId && r.tipo === tipo);
  const ultimoHecho = pasos.findLastIndex((s) => registro(s.puesto.id, s.tipo));
  for (let i = 0; i < ultimoHecho; i++) {
    const s = pasos[i];
    if (!registro(s.puesto.id, s.tipo)) {
      res.push(`Falta ${txt(s.tipo)} en ${s.puesto.nombre}`);
    }
  }

  let anterior: { hora: Date; desc: string } | null = null;
  for (const s of pasos) {
    const r = registro(s.puesto.id, s.tipo);
    if (!r) continue;
    const desc = `${txt(s.tipo)} en ${s.puesto.nombre}`;
    if (anterior && r.hora < anterior.hora) {
      res.push(`${desc} tiene hora anterior a ${anterior.desc}`);
    }
    anterior = { hora: r.hora, desc };
  }
  return res;
}
