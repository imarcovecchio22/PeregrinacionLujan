import { describe, expect, it } from "vitest";
import { PUESTOS_DEFAULT } from "@/domain/puestos-default";
import type { PuestoDom } from "@/domain/tipos";
import type { FilaPuesto, RegistroApi } from "./tipos-api";
import { agrupar, armarFila, claveCambio, coincide, combinar, hrefTelefono, type CambioLocal } from "./vista-puesto";

const puestos: PuestoDom[] = PUESTOS_DEFAULT.map((p) => ({ ...p, id: p.nombre }));
const laReja = puestos.find((p) => p.nombre === "La Reja")!;

function fila(numero: number, partida: string, registros: Partial<RegistroApi>[] = [], abandono: string | null = null): FilaPuesto {
  const id = `c${numero}`;
  return {
    caminante: {
      id,
      numero,
      nombreCompleto: `Pérez Ñandú ${numero}`,
      telefonos: ["11 4444-5555"],
      notas: null,
      puntoPartidaId: partida,
      abandonoTrasPuestoId: abandono,
      transporteIda: null,
      transporteVuelta: "MICRO",
    },
    registros: registros.map((r, i) => ({
      id: `r${numero}-${i}`,
      caminanteId: id,
      puestoId: "La Reja",
      tipo: "INGRESO",
      hora: "2026-10-03T20:00:00.000Z",
      cargadoPor: null,
      ...r,
    })),
  };
}

describe("agrupar en La Reja", () => {
  const filas = [
    fila(5, "Liniers"), // no llegó
    fila(2, "Liniers", [{ tipo: "INGRESO" }]), // en el puesto
    fila(3, "Liniers", [{ tipo: "INGRESO" }, { tipo: "SALIDA" }]), // completo
    fila(4, "La Reja"), // parte de acá y no salió
    fila(1, "La Reja", [{ tipo: "SALIDA" }]), // partió
    fila(6, "Liniers", [], "Merlo"), // abandonó antes
  ].map((f) => armarFila(f, laReja, puestos));
  const g = agrupar(filas);

  it("faltantes primero, ordenados por número", () => {
    expect(g.FALTAN_LLEGAR.map((f) => f.caminante.numero)).toEqual([4, 5]);
    expect(g.EN_EL_PUESTO.map((f) => f.caminante.numero)).toEqual([2]);
    expect(g.COMPLETOS.map((f) => f.caminante.numero)).toEqual([1, 3]);
    expect(g.ABANDONARON.map((f) => f.caminante.numero)).toEqual([6]);
  });

  it("las filas con error de guardado van arriba aunque estén completas", () => {
    const conError = agrupar(filas, new Set(["c3"]));
    expect(conError.SIN_GUARDAR.map((f) => f.caminante.numero)).toEqual([3]);
    expect(conError.COMPLETOS.map((f) => f.caminante.numero)).toEqual([1]);
  });

  it("quien parte del puesto solo tiene pendiente la Salida", () => {
    expect(filas.find((f) => f.caminante.numero === 4)!.pendientes).toEqual(["SALIDA"]);
    expect(filas.find((f) => f.caminante.numero === 5)!.pendientes).toEqual(["INGRESO", "SALIDA"]);
  });
});

describe("combinar cambios locales", () => {
  it("un guardado pendiente aparece y un borrado pendiente desaparece", () => {
    const base = [fila(1, "Liniers", [{ tipo: "INGRESO" }])];
    const nuevo: RegistroApi = { ...base[0].registros[0], id: "nuevo", tipo: "SALIDA" };
    const cambios = new Map<string, CambioLocal>([
      [claveCambio("c1", "SALIDA"), { accion: "guardar", registro: nuevo }],
      [claveCambio("c1", "INGRESO"), { accion: "borrar", registro: base[0].registros[0] }],
    ]);
    expect(combinar(base, cambios)[0].registros.map((r) => r.id)).toEqual(["nuevo"]);
  });
});

describe("búsqueda", () => {
  const f = fila(12, "Liniers");
  it("por número exacto", () => {
    expect(coincide(f, "12")).toBe(true);
    expect(coincide(f, "#12")).toBe(true);
    expect(coincide(f, "1")).toBe(false);
  });
  it("por nombre, sin acentos y en cualquier orden", () => {
    expect(coincide(f, "nandu perez")).toBe(true);
    expect(coincide(f, "gomez")).toBe(false);
  });
  it("por teléfono", () => {
    expect(coincide(f, "4444-55")).toBe(true);
  });
});

describe("hrefTelefono", () => {
  it("limpia el formato", () => {
    expect(hrefTelefono("11 4444-5555")).toBe("tel:1144445555");
    expect(hrefTelefono("+54 9 351 555-0103")).toBe("tel:+5493515550103");
    expect(hrefTelefono("-")).toBeNull();
  });
});
