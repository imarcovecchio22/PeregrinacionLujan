import { describe, expect, it } from "vitest";
import { generarCaminantesFicticios } from "../../prisma/datos-ficticios";
import { esperadoEnMicro, estadoMicro, motivoNoEsperado } from "./micros";
import { PUESTOS_DEFAULT } from "./puestos-default";
import type { CaminanteDom, PuestoDom } from "./tipos";

const puestos: PuestoDom[] = PUESTOS_DEFAULT.map((p) => ({ ...p, id: p.nombre }));
const caminantes: CaminanteDom[] = generarCaminantesFicticios().map((c) => ({
  id: String(c.numero),
  puntoPartidaId: c.partida,
  abandonoTrasPuestoId: null,
  transporteIda: c.transporteIda,
  transporteVuelta: c.transporteVuelta,
}));

describe("quiénes se esperan en cada micro (proporciones de la planilla)", () => {
  it("ida: los 95 que salen de Liniers en micro", () => {
    expect(caminantes.filter((c) => esperadoEnMicro(c, "IDA", puestos))).toHaveLength(95);
  });

  it("vuelta: los 152 que vuelven en micro", () => {
    expect(caminantes.filter((c) => esperadoEnMicro(c, "VUELTA", puestos))).toHaveLength(152);
  });

  it("quien abandonó no se espera en la vuelta (pero sí en la ida, que ya pasó)", () => {
    const c: CaminanteDom = {
      id: "x",
      puntoPartidaId: "Liniers",
      abandonoTrasPuestoId: "Merlo",
      transporteIda: "MICRO",
      transporteVuelta: "MICRO",
    };
    expect(esperadoEnMicro(c, "VUELTA", puestos)).toBe(false);
    expect(esperadoEnMicro(c, "IDA", puestos)).toBe(true);
    expect(motivoNoEsperado(c, "VUELTA", puestos)).toBe("abandonó tras Merlo");
  });

  it("motivos de no estar anotado", () => {
    const deLaReja = caminantes.find((c) => c.puntoPartidaId === "La Reja")!;
    expect(motivoNoEsperado(deLaReja, "IDA", puestos)).toBe("sale desde La Reja");
    const porSuCuenta = caminantes.find((c) => c.transporteVuelta === "POR_SU_CUENTA")!;
    expect(motivoNoEsperado(porSuCuenta, "VUELTA", puestos)).toBe("vuelve por su cuenta");
  });
});

describe("estadoMicro", () => {
  it("cuenta subieron, faltan y extras (no anotados que subieron igual)", () => {
    const esperado = caminantes.find((c) => esperadoEnMicro(c, "VUELTA", puestos))!;
    const noAnotado = caminantes.find((c) => !esperadoEnMicro(c, "VUELTA", puestos))!;
    expect(estadoMicro(caminantes, "VUELTA", puestos, new Set([esperado.id, noAnotado.id]))).toEqual({
      esperados: 152,
      subieron: 1,
      faltan: 151,
      extras: 1,
    });
  });
});
