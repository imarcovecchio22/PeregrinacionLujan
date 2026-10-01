import "server-only";
import ExcelJS from "exceljs";
import { describirPosicion, inconsistencias, posicionActual, registrosPlanificados } from "@/domain/recorrido";
import { estadoMicro, NOMBRE_TRAMO, TRAMOS, type Tramo } from "@/domain/micros";
import { calcularResumen } from "@/domain/resumen";
import { formatHora } from "@/domain/hora";
import {
  columnasPlanilla,
  FILA_ENCABEZADO,
  FILA_PRIMER_DATO,
  letraColumna,
  NA,
  TEXTO_TRANSPORTE,
  tituloPuesto,
} from "@/domain/planilla";
import type { CaminanteDom, PuestoDom, RegistroDom } from "@/domain/tipos";

// Colores y formato copiados de la planilla original.
const AZUL = "FF1F3864";
const CELESTE = "FFD9E1F2";
const AMARILLO = "FFFFF2CC";
const GRIS = "FFEDEDED";
const GRIS_TEXTO = "FF808080";
const BORDE: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};
const relleno = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

export interface DatosExportacion {
  nombre: string;
  puestos: PuestoDom[];
  caminantes: (CaminanteDom & { numero: number; nombreCompleto: string; dni: string | null; telefonos: string[] })[];
  registros: RegistroDom[];
  /** Quién subió a cada micro (ids de caminante). */
  abordajes?: Record<Tramo, Set<string>>;
}

/** Hora como fracción de día (lo que Excel entiende como hora), en hora argentina. */
function fraccionDia(d: Date): number {
  const [h, m] = formatHora(d).split(":").map(Number);
  return (h * 60 + m) / 1440;
}

export async function generarPlanilla(datos: DatosExportacion): Promise<Buffer> {
  const puestos = [...datos.puestos].sort((a, b) => a.orden - b.orden);
  const caminantes = [...datos.caminantes].sort((a, b) => a.numero - b.numero);
  const cols = columnasPlanilla(puestos);
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet("Listado", { views: [{ state: "frozen", ySplit: FILA_PRIMER_DATO - 1 }] });

  // Notas
  hoja.getCell("A1").value = "Completar hora de ingreso y salida en las celdas amarillas ";
  hoja.getCell("A1").font = { bold: true };
  hoja.getCell("A2").value = "NA = la persona no pasa por ese puesto porque sale más adelante. ";

  // Encabezado (dos filas; combinado verticalmente salvo los puestos)
  const enc = hoja.getRow(FILA_ENCABEZADO);
  const sub = hoja.getRow(FILA_ENCABEZADO + 1);
  enc.height = 15;
  cols.forEach((col, i) => {
    const c = i + 1;
    enc.getCell(c).value = col.titulo;
    sub.getCell(c).value = col.tipo === "registro" ? col.subtitulo : col.titulo;
    for (const celda of [enc.getCell(c), sub.getCell(c)]) {
      celda.border = BORDE;
      celda.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
      celda.fill = relleno(AZUL);
    }
    if (col.tipo === "registro") {
      sub.getCell(c).fill = relleno(CELESTE);
      sub.getCell(c).font = { bold: true };
    }
  });
  cols.forEach((col, i) => {
    if (col.tipo !== "registro") hoja.mergeCells(FILA_ENCABEZADO, i + 1, FILA_ENCABEZADO + 1, i + 1);
  });
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    if (col.tipo === "registro" && cols[i + 1]?.tipo === "registro" && cols[i + 1].titulo === col.titulo) {
      hoja.mergeCells(FILA_ENCABEZADO, i + 1, FILA_ENCABEZADO, i + 2);
    }
  }

  // Datos
  const nombrePuesto = new Map(puestos.map((p) => [p.id, p.nombre]));
  const registro = (caminanteId: string, puestoId: string, tipo: string) =>
    datos.registros.find((r) => r.caminanteId === caminanteId && r.puestoId === puestoId && r.tipo === tipo);
  caminantes.forEach((cam, idx) => {
    const fila = hoja.getRow(FILA_PRIMER_DATO + idx);
    cols.forEach((col, i) => {
      const celda = fila.getCell(i + 1);
      celda.border = BORDE;
      celda.alignment = { horizontal: col.tipo === "nombre" || col.tipo === "dni" || col.tipo === "telefono" ? "left" : "center" };
      switch (col.tipo) {
        case "numero":
          celda.value = cam.numero;
          break;
        case "nombre":
          celda.value = cam.nombreCompleto;
          break;
        case "dni":
          celda.value = cam.dni;
          break;
        case "telefono":
          celda.value = cam.telefonos.join(" / ") || null;
          break;
        case "partida":
          celda.value = nombrePuesto.get(cam.puntoPartidaId) ?? null;
          break;
        case "ida":
          celda.value =
            cam.puntoPartidaId === puestos[0].id ? (cam.transporteIda ? TEXTO_TRANSPORTE[cam.transporteIda] : null) : NA;
          break;
        case "vuelta":
          celda.value = cam.transporteVuelta ? TEXTO_TRANSPORTE[cam.transporteVuelta] : null;
          break;
        case "registro": {
          const puesto = puestos.find((p) => p.id === col.puestoId)!;
          if (!registrosPlanificados(cam, puesto, puestos).includes(col.registro)) {
            celda.value = NA;
            celda.fill = relleno(GRIS);
            celda.font = { color: { argb: GRIS_TEXTO } };
          } else {
            const r = registro(cam.id, col.puestoId, col.registro);
            celda.value = r ? fraccionDia(r.hora) : null;
            celda.numFmt = "hh:mm";
            celda.fill = relleno(AMARILLO);
          }
          break;
        }
      }
    });
  });

  hoja.columns.forEach((columna, i) => {
    const tipo = cols[i]?.tipo;
    columna.width =
      tipo === "numero" ? 5 : tipo === "nombre" ? 32.43 : tipo === "dni" || tipo === "telefono" ? 23.14 : tipo === "registro" ? 10.71 : 12.86;
  });

  agregarResumen(wb, datos, puestos, cols);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Hoja "Resumen y control": mismas fórmulas que la original, con el resultado ya calculado. */
function agregarResumen(
  wb: ExcelJS.Workbook,
  datos: DatosExportacion,
  puestos: PuestoDom[],
  cols: ReturnType<typeof columnasPlanilla>,
) {
  const hoja = wb.addWorksheet("Resumen y control");
  hoja.getColumn(1).width = 90;
  hoja.getColumn(2).width = 12;
  const r = calcularResumen(datos.caminantes, puestos, datos.registros);
  const ultima = FILA_PRIMER_DATO + Math.max(datos.caminantes.length, 1) - 1;
  const rango = (tipo: string, extra?: (c: (typeof cols)[number]) => boolean) => {
    const i = cols.findIndex((c) => c.tipo === tipo && (!extra || extra(c)));
    const l = letraColumna(i);
    return `Listado!$${l}$${FILA_PRIMER_DATO}:$${l}$${ultima}`;
  };
  const personas = `COUNTA(${rango("nombre")})`;
  const primero = puestos[0];
  const ultimoPuesto = puestos[puestos.length - 1];

  let fila = 1;
  const titulo = (t: string) => {
    hoja.getCell(fila, 1).value = t;
    hoja.getCell(fila, 1).font = { bold: true };
    fila++;
  };
  const dato = (t: string, formula: string, resultado: number) => {
    hoja.getCell(fila, 1).value = t;
    hoja.getCell(fila, 2).value = { formula, result: resultado };
    hoja.getCell(fila, 2).font = { bold: true };
    fila++;
  };

  titulo(`Resumen (se calcula solo a partir de la hoja Listado) — ${datos.nombre}`);
  fila++;
  dato("Personas únicas en el listado", personas, r.personas);
  for (const p of puestos.filter((x) => x.esPartidaPosible)) {
    dato(`Salen desde ${p.nombre}`, `COUNTIF(${rango("partida")},"${p.nombre}")`, r.salenDesde[p.id]);
    if (p.id === primero.id) {
      dato(`   de ellos van a ${p.nombre} en micro`, `COUNTIF(${rango("ida")},"${TEXTO_TRANSPORTE.MICRO}")`, r.ida.micro);
      dato(
        `   de ellos van a ${p.nombre} por su cuenta`,
        `COUNTIF(${rango("ida")},"${TEXTO_TRANSPORTE.POR_SU_CUENTA}")`,
        r.ida.porSuCuenta,
      );
    }
  }
  dato(`Vuelven desde ${ultimoPuesto.nombre} en micro`, `COUNTIF(${rango("vuelta")},"${TEXTO_TRANSPORTE.MICRO}")`, r.vuelta.micro);
  dato(
    `Vuelven desde ${ultimoPuesto.nombre} por su cuenta`,
    `COUNTIF(${rango("vuelta")},"${TEXTO_TRANSPORTE.POR_SU_CUENTA}")`,
    r.vuelta.porSuCuenta,
  );
  fila++;
  titulo("Personas que pasan por cada puesto");
  for (const p of puestos.slice(1)) {
    const tipo = p.registraIngreso ? "INGRESO" : "SALIDA";
    const col = rango("registro", (c) => c.tipo === "registro" && c.puestoId === p.id && c.registro === tipo);
    dato(tituloPuesto(p), `${personas}-COUNTIF(${col},"${NA}")`, r.pasanPorPuesto[p.id]);
  }

  if (datos.abordajes) {
    fila++;
    titulo("Micros (al momento de descargar)");
    for (const t of TRAMOS) {
      const m = estadoMicro(datos.caminantes, t, puestos, datos.abordajes[t]);
      hoja.getCell(fila, 1).value = `${NOMBRE_TRAMO[t]}: subieron (de ${m.esperados} anotados)${m.extras ? ` + ${m.extras} no anotados` : ""}`;
      hoja.getCell(fila, 2).value = m.subieron;
      hoja.getCell(fila, 2).font = { bold: true };
      fila++;
    }
    const checkin = estadoMicro(datos.caminantes, "CHECKIN", puestos, datos.abordajes.CHECKIN);
    hoja.getCell(fila, 1).value = `Check-in en la parroquia: llegaron (de ${checkin.esperados})`;
    hoja.getCell(fila, 2).value = checkin.subieron;
    hoja.getCell(fila, 2).font = { bold: true };
    fila++;
  }

  // Lo que la planilla no tiene columnas para mostrar: abandonos e inconsistencias.
  const porCaminante = Map.groupBy(datos.registros, (x) => x.caminanteId);
  const notas: string[] = [];
  for (const c of datos.caminantes) {
    const propios = porCaminante.get(c.id) ?? [];
    if (c.abandonoTrasPuestoId) {
      notas.push(`• #${c.numero} ${c.nombreCompleto}: ${describirPosicion(posicionActual(c, puestos, propios), puestos)}.`);
    }
    for (const i of inconsistencias(c, puestos, propios)) notas.push(`• #${c.numero} ${c.nombreCompleto}: ${i}.`);
  }
  if (notas.length > 0) {
    fila++;
    titulo("Para revisar (generado por la app)");
    for (const n of notas) {
      hoja.getCell(fila, 1).value = n;
      hoja.getCell(fila, 1).alignment = { wrapText: true };
      fila++;
    }
  }
}
