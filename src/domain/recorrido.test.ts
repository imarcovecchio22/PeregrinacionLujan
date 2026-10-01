import { describe, expect, it } from "vitest";
import { generarCaminantesFicticios } from "../../prisma/datos-ficticios";
import { PUESTOS_DEFAULT } from "./puestos-default";
import {
  describirPosicion,
  estadoPuesto,
  inconsistencias,
  posicionActual,
  registrosPlanificados,
  registrosVigentes,
} from "./recorrido";
import { calcularResumen } from "./resumen";
import type { CaminanteDom, PuestoDom, RegistroDom } from "./tipos";

const puestos: PuestoDom[] = PUESTOS_DEFAULT.map((p) => ({ ...p, id: p.nombre }));
const P = Object.fromEntries(puestos.map((p) => [p.nombre, p])) as Record<string, PuestoDom>;

function caminante(partida: string, extra: Partial<CaminanteDom> = {}): CaminanteDom {
  return {
    id: extra.id ?? "c1",
    puntoPartidaId: partida,
    abandonoTrasPuestoId: null,
    transporteIda: null,
    transporteVuelta: "MICRO",
    ...extra,
  };
}

function reg(caminanteId: string, puestoId: string, tipo: "INGRESO" | "SALIDA", hhmm = "10:00"): RegistroDom {
  return { caminanteId, puestoId, tipo, hora: new Date(`2026-10-03T${hhmm}:00-03:00`) };
}

describe("registros planificados por puesto", () => {
  it("quien sale de Liniers: solo Salida en Liniers, Ingreso y Salida en intermedios, solo Ingreso en Luján", () => {
    const c = caminante("Liniers");
    expect(registrosPlanificados(c, P["Liniers"], puestos)).toEqual(["SALIDA"]);
    expect(registrosPlanificados(c, P["Castelar"], puestos)).toEqual(["INGRESO", "SALIDA"]);
    expect(registrosPlanificados(c, P["Rodríguez"], puestos)).toEqual(["INGRESO", "SALIDA"]);
    expect(registrosPlanificados(c, P["Luján"], puestos)).toEqual(["INGRESO"]);
  });

  it("quien sale de La Reja: NA antes, solo Salida en La Reja", () => {
    const c = caminante("La Reja");
    expect(registrosPlanificados(c, P["Liniers"], puestos)).toEqual([]);
    expect(registrosPlanificados(c, P["Merlo"], puestos)).toEqual([]);
    expect(registrosPlanificados(c, P["La Reja"], puestos)).toEqual(["SALIDA"]);
    expect(registrosPlanificados(c, P["Rodríguez"], puestos)).toEqual(["INGRESO", "SALIDA"]);
    expect(registrosPlanificados(c, P["Luján"], puestos)).toEqual(["INGRESO"]);
  });

  it("quien sale de Rodríguez: solo Salida en Rodríguez e Ingreso en Luján", () => {
    const c = caminante("Rodríguez");
    expect(registrosPlanificados(c, P["La Reja"], puestos)).toEqual([]);
    expect(registrosPlanificados(c, P["Rodríguez"], puestos)).toEqual(["SALIDA"]);
    expect(registrosPlanificados(c, P["Luján"], puestos)).toEqual(["INGRESO"]);
  });

  it("abandono después de Merlo: Ingreso en Merlo sigue esperado, Salida opcional, nada después", () => {
    const c = caminante("Liniers", { abandonoTrasPuestoId: "Merlo" });
    expect(registrosVigentes(c, P["Castelar"], puestos)).toEqual(["INGRESO", "SALIDA"]);
    expect(registrosVigentes(c, P["Merlo"], puestos)).toEqual(["INGRESO"]);
    expect(registrosVigentes(c, P["La Reja"], puestos)).toEqual([]);
    expect(registrosVigentes(c, P["Luján"], puestos)).toEqual([]);
    // El plan no cambia: sigue contando en "pasan por".
    expect(registrosPlanificados(c, P["Luján"], puestos)).toEqual(["INGRESO"]);
  });
});

describe("Resumen con datos en las proporciones de la planilla (test de aceptación)", () => {
  const ficticios = generarCaminantesFicticios();
  const caminantes: CaminanteDom[] = ficticios.map((c) => ({
    id: String(c.numero),
    puntoPartidaId: c.partida,
    abandonoTrasPuestoId: null,
    transporteIda: c.transporteIda,
    transporteVuelta: c.transporteVuelta,
  }));
  const r = calcularResumen(caminantes, puestos);

  it("personas y partidas", () => {
    expect(r.personas).toBe(161);
    expect(r.salenDesde).toEqual({ Liniers: 102, "La Reja": 46, Rodríguez: 13 });
  });

  it("transporte de ida (solo Liniers) y vuelta", () => {
    expect(r.ida).toEqual({ micro: 95, porSuCuenta: 7, sinDato: 0 });
    expect(r.vuelta).toEqual({ micro: 152, porSuCuenta: 9, sinDato: 0 });
  });

  it("pasan por cada puesto (la partida no cuenta)", () => {
    expect(r.pasanPorPuesto).toEqual({
      Liniers: 0,
      Castelar: 102,
      Merlo: 102,
      "La Reja": 102,
      Rodríguez: 148,
      Luján: 161,
    });
  });

  it("estado inicial por puesto, sin registros", () => {
    const laReja = r.estadoPorPuesto.find((e) => e.puestoId === "La Reja")!;
    // 102 pasan (Ingreso + Salida) y 46 parten (solo Salida).
    expect(laReja).toMatchObject({
      esperados: 148,
      esperanIngreso: 102,
      faltanIngresar: 102,
      esperanSalida: 148,
      faltanSalir: 148,
    });
    const lujan = r.estadoPorPuesto.find((e) => e.puestoId === "Luján")!;
    expect(lujan).toMatchObject({ esperados: 161, esperanIngreso: 161, esperanSalida: 0 });
  });
});

describe("estado de un puesto en tiempo real", () => {
  it("cuenta ingresos, salidas y descuenta abandonos", () => {
    const caminantes = [
      caminante("Liniers", { id: "a" }),
      caminante("Liniers", { id: "b" }),
      caminante("Liniers", { id: "c", abandonoTrasPuestoId: "Merlo" }),
      caminante("La Reja", { id: "d" }),
    ];
    const registros = [
      reg("a", "Merlo", "INGRESO"),
      reg("a", "Merlo", "SALIDA"),
      reg("b", "Merlo", "INGRESO"),
      reg("c", "Merlo", "INGRESO"),
    ];
    const e = estadoPuesto(P["Merlo"], caminantes, puestos, registros);
    expect(e).toMatchObject({
      esperados: 3,
      esperadosVigentes: 3,
      esperanIngreso: 3,
      ingresaron: 3,
      faltanIngresar: 0,
      esperanSalida: 2, // c abandonó: su salida es opcional
      salieron: 1,
      faltanSalir: 1,
      abandonos: 1,
    });
    const laReja = estadoPuesto(P["La Reja"], caminantes, puestos, registros);
    expect(laReja).toMatchObject({ esperados: 4, esperadosVigentes: 3, esperanIngreso: 2, esperanSalida: 3 });
  });
});

describe("inconsistencias", () => {
  it("Ingreso en Merlo sin Salida de Castelar", () => {
    const c = caminante("Liniers");
    const regs = [
      reg("c1", "Liniers", "SALIDA", "07:00"),
      reg("c1", "Castelar", "INGRESO", "08:00"),
      reg("c1", "Merlo", "INGRESO", "09:30"),
    ];
    expect(inconsistencias(c, puestos, regs)).toEqual(["Falta Salida en Castelar"]);
  });

  it("registro en un puesto que no le corresponde y horas que retroceden", () => {
    const c = caminante("La Reja");
    const regs = [
      reg("c1", "Merlo", "INGRESO", "08:00"),
      reg("c1", "La Reja", "SALIDA", "12:00"),
      reg("c1", "Rodríguez", "INGRESO", "11:00"),
    ];
    expect(inconsistencias(c, puestos, regs)).toEqual([
      "Ingreso en Merlo: no le corresponde",
      "Ingreso en Rodríguez tiene hora anterior a Salida en La Reja",
    ]);
  });

  it("sin Salida de la partida pero con pasos posteriores: no es inconsistencia (salió)", () => {
    const regs = [reg("c1", "Castelar", "INGRESO", "08:00")];
    expect(inconsistencias(caminante("Liniers"), puestos, regs)).toEqual([]);
    expect(inconsistencias(caminante("La Reja"), puestos, [reg("c1", "Rodríguez", "INGRESO")])).toEqual([]);
  });

  it("recorrido completo y en orden: sin inconsistencias", () => {
    const c = caminante("Rodríguez");
    const regs = [reg("c1", "Rodríguez", "SALIDA", "20:00"), reg("c1", "Luján", "INGRESO", "23:30")];
    expect(inconsistencias(c, puestos, regs)).toEqual([]);
  });
});

describe("posición actual", () => {
  const pos = (c: CaminanteDom, regs: RegistroDom[]) => posicionActual(c, puestos, regs);

  it("sin registros: sin salir de su partida", () => {
    expect(pos(caminante("La Reja"), [])).toEqual({ tipo: "SIN_SALIR", puestoId: "La Reja" });
  });

  it("salió de la partida: caminando hacia el siguiente puesto", () => {
    expect(pos(caminante("Liniers"), [reg("c1", "Liniers", "SALIDA")])).toEqual({
      tipo: "CAMINANDO",
      desdeId: "Liniers",
      hastaId: "Castelar",
    });
  });

  it("ingresó y no salió: en el puesto", () => {
    const regs = [reg("c1", "Rodríguez", "SALIDA"), reg("c1", "Luján", "INGRESO")];
    expect(pos(caminante("La Reja"), [reg("c1", "La Reja", "SALIDA"), reg("c1", "Rodríguez", "INGRESO")])).toEqual({
      tipo: "EN_PUESTO",
      puestoId: "Rodríguez",
    });
    expect(pos(caminante("Rodríguez"), regs)).toEqual({ tipo: "LLEGO", puestoId: "Luján" });
  });

  it("toma el último paso registrado aunque falten anteriores", () => {
    expect(pos(caminante("Liniers"), [reg("c1", "Merlo", "INGRESO")])).toEqual({ tipo: "EN_PUESTO", puestoId: "Merlo" });
  });

  it("abandono manda", () => {
    const c = caminante("Liniers", { abandonoTrasPuestoId: "Castelar" });
    expect(pos(c, [reg("c1", "Castelar", "INGRESO")])).toEqual({ tipo: "ABANDONO", puestoId: "Castelar" });
    expect(describirPosicion(pos(c, []), puestos)).toBe("Abandonó tras Castelar");
  });
});
