import { describe, expect, it } from "vitest";
import type { FilaMicro } from "./tipos-api";
import { agruparMicro, filasDelTurno } from "./vista-micro";

function fila(numero: number, esperado: boolean, subio: boolean, nombre = `Ficticio ${numero}`): FilaMicro {
  const id = `c${numero}`;
  return {
    caminante: {
      id,
      numero,
      nombreCompleto: nombre,
      telefonos: [],
      dni: `4000000${numero}`,
      notas: null,
      puntoPartidaId: "Liniers",
      abandonoTrasPuestoId: null,
      transporteIda: "MICRO",
      transporteVuelta: esperado ? "MICRO" : "POR_SU_CUENTA",
    },
    partida: "Liniers",
    turno: "07:00",
    esperado,
    motivo: esperado ? null : "vuelve por su cuenta",
    abordaje: subio ? { id: `a${numero}`, caminanteId: id, tramo: "VUELTA", hora: "2026-10-04T12:00:00Z", cargadoPor: null } : null,
  };
}

const filas = [fila(1, true, false), fila(2, true, true), fila(3, false, true), fila(4, false, false, "Demo Buscable")];

describe("agruparMicro", () => {
  it("faltan, subieron y extras; los no anotados que no subieron no se listan", () => {
    const { grupos, noAnotados } = agruparMicro(filas, "");
    expect(grupos.FALTAN.map((f) => f.caminante.numero)).toEqual([1]);
    expect(grupos.SUBIERON.map((f) => f.caminante.numero)).toEqual([2]);
    expect(grupos.EXTRAS.map((f) => f.caminante.numero)).toEqual([3]);
    expect(noAnotados).toEqual([]);
  });

  it("buscando a alguien no anotado, aparece aparte para poder marcarlo igual", () => {
    const { grupos, noAnotados } = agruparMicro(filas, "buscable");
    expect(Object.values(grupos).flat()).toEqual([]);
    expect(noAnotados.map((f) => f.caminante.numero)).toEqual([4]);
  });

  it("busca por DNI; error arriba; fila guardándose queda fija", () => {
    expect(agruparMicro(filas, "40000002").grupos.SUBIERON).toHaveLength(1);
    expect(agruparMicro(filas, "", new Set(["c2"])).grupos.SIN_GUARDAR.map((f) => f.caminante.numero)).toEqual([2]);
    expect(agruparMicro(filas, "", new Set(), new Map([["c2", "FALTAN" as const]])).grupos.FALTAN).toHaveLength(2);
  });
});

describe("check-in por turno", () => {
  const manana = { ...fila(1, true, true), turno: "07:00" };
  const tarde = { ...fila(2, true, false), turno: "14:00", partida: "La Reja" };
  const filas = [manana, tarde];

  it("solo se esperan los del turno elegido; los de otro turno no se listan aunque hayan llegado", () => {
    const { grupos } = agruparMicro(filasDelTurno(filas, "14:00"), "", new Set(), new Map(), false);
    expect(grupos.FALTAN.map((f) => f.caminante.numero)).toEqual([2]);
    expect(grupos.EXTRAS).toEqual([]);
    expect(grupos.SUBIERON).toEqual([]);
  });

  it("buscando a alguien de otro turno, aparece aparte con su turno y partida", () => {
    const { noAnotados } = agruparMicro(filasDelTurno(filas, "07:00"), "Ficticio 2", new Set(), new Map(), false);
    expect(noAnotados.map((f) => f.motivo)).toEqual(["14:00, sale desde La Reja"]);
  });
});
