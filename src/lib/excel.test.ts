import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { generarCaminantesFicticios } from "../../prisma/datos-ficticios";
import { asignarFechas, leerListado } from "@/domain/importar";
import { PUESTOS_DEFAULT } from "@/domain/puestos-default";
import { calcularResumen } from "@/domain/resumen";
import type { PuestoDom, RegistroDom } from "@/domain/tipos";
import { generarPlanilla, type DatosExportacion } from "./excel-exportar";
import { leerMatriz } from "./excel-leer";

const puestos: PuestoDom[] = PUESTOS_DEFAULT.map((p) => ({ ...p, id: p.nombre }));
const caminantes: DatosExportacion["caminantes"] = generarCaminantesFicticios().map((c) => ({
  id: `c${c.numero}`,
  numero: c.numero,
  nombreCompleto: c.nombreCompleto,
  dni: null,
  telefonos: c.telefonos,
  puntoPartidaId: c.partida,
  abandonoTrasPuestoId: null,
  transporteIda: c.transporteIda,
  transporteVuelta: c.transporteVuelta,
}));
const ar = (s: string) => new Date(`${s}-03:00`);
const registros: RegistroDom[] = [
  { caminanteId: "c1", puestoId: "Castelar", tipo: "INGRESO", hora: ar("2026-10-03T22:10:00") },
  { caminanteId: "c1", puestoId: "Castelar", tipo: "SALIDA", hora: ar("2026-10-03T22:40:00") },
  { caminanteId: "c1", puestoId: "Merlo", tipo: "INGRESO", hora: ar("2026-10-04T01:05:00") },
];

async function exportarYLeer() {
  const buffer = await generarPlanilla({ nombre: "Prueba", puestos, caminantes, registros });
  const archivo = new File([new Uint8Array(buffer)], "planilla.xlsx");
  return { buffer, lectura: leerListado(await leerMatriz(archivo), puestos) };
}

describe("exportar → importar (ida y vuelta)", () => {
  it("recupera todos los caminantes con sus datos", async () => {
    const { lectura } = await exportarYLeer();
    expect(lectura.errores).toEqual([]);
    expect(lectura.filas).toHaveLength(161);
    for (const f of lectura.filas) {
      const c = caminantes.find((x) => x.numero === f.numero)!;
      expect(f.nombreCompleto).toBe(c.nombreCompleto);
      expect(f.telefonos).toEqual(c.telefonos);
      expect(f.puntoPartidaId).toBe(c.puntoPartidaId);
      expect(f.transporteIda).toBe(c.transporteIda);
      expect(f.transporteVuelta).toBe(c.transporteVuelta);
    }
  });

  it("el resumen de la planilla importada es el de aceptación", async () => {
    const { lectura } = await exportarYLeer();
    const r = calcularResumen(
      lectura.filas.map((f) => ({ ...f, id: String(f.numero), abandonoTrasPuestoId: null })),
      puestos,
    );
    expect(r.personas).toBe(161);
    expect(r.salenDesde).toEqual({ Liniers: 102, "La Reja": 46, Rodríguez: 13 });
    expect(r.ida).toMatchObject({ micro: 95, porSuCuenta: 7 });
    expect(r.vuelta).toMatchObject({ micro: 152, porSuCuenta: 9 });
    expect(r.pasanPorPuesto).toMatchObject({ Castelar: 102, Merlo: 102, "La Reja": 102, Rodríguez: 148, Luján: 161 });
  });

  it("recupera las horas, cruzando la medianoche", async () => {
    const { lectura } = await exportarYLeer();
    const f = lectura.filas.find((x) => x.numero === 1)!;
    expect(asignarFechas(f.registros, puestos, "2026-10-03", "12:00").map((r) => r.hora)).toEqual(registros.map((r) => r.hora));
  });

  it("mismo formato que la original: encabezado, NA y fórmulas del resumen", async () => {
    const { buffer } = await exportarYLeer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const hoja = wb.getWorksheet("Listado")!;
    expect(hoja.getRow(4).values).toEqual([
      undefined,
      "N°", "Apellido y nombre", "DNI", "Teléfono", "Sale desde", "Ida a Liniers",
      "1. Castelar", "1. Castelar", "2. Merlo", "2. Merlo", "3. La Reja", "3. La Reja",
      "4. Rodríguez", "4. Rodríguez", "5. Luján", "Vuelta desde Luján",
    ]);
    expect(hoja.getCell("G5").value).toBe("Ingreso");
    expect(hoja.getCell("H5").value).toBe("Salida");
    expect(hoja.getCell("G6").numFmt).toBe("hh:mm");
    const resumen = wb.getWorksheet("Resumen y control")!;
    expect(resumen.getCell("B3").value).toMatchObject({ formula: "COUNTA(Listado!$B$6:$B$166)", result: 161 });
    expect(resumen.getCell("B4").value).toMatchObject({ formula: 'COUNTIF(Listado!$E$6:$E$166,"Liniers")', result: 102 });
  });
});
