import "server-only";
import ExcelJS from "exceljs";
import { parsearCsv } from "@/domain/csv";
import type { Celda } from "@/domain/importar";

/** Convierte XLSX (hoja "Listado", o la primera) o CSV en una matriz de celdas simples. */
export async function leerMatriz(archivo: File): Promise<Celda[][]> {
  const nombre = archivo.name.toLowerCase();
  if (nombre.endsWith(".csv") || archivo.type === "text/csv") {
    return parsearCsv(await archivo.text());
  }
  if (!nombre.endsWith(".xlsx")) throw new Error("Formato no soportado: subí un archivo .xlsx o .csv.");

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await archivo.arrayBuffer());
  } catch {
    throw new Error("No se pudo leer el archivo. ¿Es un .xlsx válido?");
  }
  const hoja = wb.worksheets.find((w) => w.name.trim().toLowerCase() === "listado") ?? wb.worksheets[0];
  if (!hoja) throw new Error("El archivo no tiene hojas.");

  const matriz: Celda[][] = [];
  hoja.eachRow({ includeEmpty: true }, (row, r) => {
    const fila: Celda[] = [];
    // En celdas combinadas, ExcelJS devuelve el valor de la celda principal (ej. "1. Castelar" en G y H).
    for (let c = 1; c <= hoja.columnCount; c++) fila.push(valorSimple(row.getCell(c).value));
    matriz[r - 1] = fila;
  });
  return Array.from(matriz, (f) => f ?? []);
}

function valorSimple(v: ExcelJS.CellValue): Celda {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v instanceof Date) return v;
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("formula" in v || "sharedFormula" in v) return valorSimple((v as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
    if ("text" in v) return String(v.text);
    if ("error" in v) return null;
  }
  return String(v);
}
