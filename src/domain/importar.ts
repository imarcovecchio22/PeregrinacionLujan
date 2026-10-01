// Lectura de la hoja "Listado" (ya convertida a una matriz de celdas) y advertencias
// de la previsualización. Puro: sin Excel, sin base de datos.

import { conHora } from "./hora";
import { registrosPlanificados } from "./recorrido";
import { NA } from "./planilla";
import { digitosTelefono, esTelefonoAmba, separarTelefonos } from "./telefonos";
import type { PuestoDom, TipoRegistro, Transporte } from "./tipos";

export type Celda = string | number | boolean | Date | null | undefined;

export interface RegistroImportado {
  puestoId: string;
  tipo: TipoRegistro;
  /** "HH:mm" tal cual la planilla (sin fecha). */
  hhmm: string;
}

export interface FilaImportada {
  /** Número de fila en Excel (1-based), para referenciar en avisos. */
  fila: number;
  numero: number;
  nombreCompleto: string;
  dni: string | null;
  telefonos: string[];
  puntoPartidaId: string;
  transporteIda: Transporte | null;
  transporteVuelta: Transporte | null;
  registros: RegistroImportado[];
}

export type TipoAviso =
  | "DUPLICADO"
  | "TELEFONO_COMPARTIDO"
  | "VARIOS_TELEFONOS"
  | "NO_AMBA"
  | "PARTIDA"
  | "TRANSPORTE"
  | "HORA";

export interface Aviso {
  tipo: TipoAviso;
  filas: number[];
  mensaje: string;
}

export interface ErrorImportacion {
  fila: number | null;
  mensaje: string;
}

export interface ResultadoLectura {
  filas: FilaImportada[];
  avisos: Aviso[];
  /** Filas que no se pueden importar (o problemas de formato del archivo). */
  errores: ErrorImportacion[];
}

// ---------- celdas ----------

const sinAcentos = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "");
export const norm = (s: string) => sinAcentos(s).toLowerCase().replace(/\s+/g, " ").trim();

export function texto(v: Celda): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString();
  const s = String(v).trim();
  return s === "" ? null : s;
}

const esNA = (v: Celda) => texto(v)?.toUpperCase() === NA;

/**
 * Hora de una celda: Date (Excel guarda horas como fecha base 1899-12-30, en UTC),
 * fracción de día (0.875 = 21:00) o texto "21:30" / "21.30" / "21:30:00".
 * Devuelve "HH:mm", null si está vacía, o "invalida".
 */
export function hora(v: Celda): string | null | "invalida" {
  if (v === null || v === undefined || texto(v) === null) return null;
  const hhmm = (min: number) => {
    const m = ((Math.round(min) % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };
  if (v instanceof Date) return hhmm(v.getUTCHours() * 60 + v.getUTCMinutes() + v.getUTCSeconds() / 60);
  if (typeof v === "number") return v >= 0 ? hhmm((v % 1) * 1440) : "invalida";
  const m = /^(\d{1,2})[:.](\d{2})(?::\d{2})?(?:\s*(?:hs?|horas?))?$/i.exec(String(v).trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return "invalida";
  return hhmm(Number(m[1]) * 60 + Number(m[2]));
}

function transporte(v: Celda): Transporte | null | "invalido" {
  const t = texto(v);
  if (!t || esNA(v)) return null;
  const n = norm(t);
  if (n === "micro" || n === "combi" || n === "colectivo") return "MICRO";
  if (n.includes("su cuenta") || n === "propio" || n === "auto") return "POR_SU_CUENTA";
  return "invalido";
}

// ---------- encabezado ----------

type Campo = "numero" | "nombre" | "dni" | "telefono" | "partida" | "ida" | "vuelta";

interface Mapa {
  campos: Partial<Record<Campo, number>>;
  registros: { col: number; puestoId: string; tipo: TipoRegistro }[];
  filaDatos: number; // índice 0-based en la matriz
}

function detectarCampo(titulo: string): Campo | null {
  const t = norm(titulo);
  if (/^(n[°ºo.]?|nro\.?|numero)$/.test(t)) return "numero";
  if (t.includes("apellido") || t === "nombre" || t === "nombre completo") return "nombre";
  if (t === "dni" || t.startsWith("documento")) return "dni";
  if (t.startsWith("telefono") || t.startsWith("celular")) return "telefono";
  if (t.startsWith("sale desde") || t.includes("partida")) return "partida";
  if (t.startsWith("ida")) return "ida";
  if (t.startsWith("vuelta")) return "vuelta";
  return null;
}

function puestoDeTitulo(titulo: string, puestos: PuestoDom[]): PuestoDom | undefined {
  const t = norm(titulo).replace(/^\d+\s*[.)-]?\s*/, "");
  return puestos.find((p) => norm(p.nombre) === t);
}

function leerEncabezado(matriz: Celda[][], puestos: PuestoDom[]): Mapa | null {
  for (let r = 0; r < Math.min(matriz.length, 15); r++) {
    const fila = matriz[r] ?? [];
    const campos: Mapa["campos"] = {};
    fila.forEach((v, c) => {
      const t = texto(v);
      const campo = t ? detectarCampo(t) : null;
      if (campo && campos[campo] === undefined) campos[campo] = c;
    });
    if (campos.numero === undefined || campos.nombre === undefined) continue;

    // Columnas de puestos: título en esta fila (celdas combinadas), Ingreso/Salida en la siguiente.
    const sub = matriz[r + 1] ?? [];
    const registros: Mapa["registros"] = [];
    let actual: PuestoDom | undefined;
    for (let c = 0; c < Math.max(fila.length, sub.length); c++) {
      const t = texto(fila[c]);
      if (t) actual = detectarCampo(t) ? undefined : puestoDeTitulo(t, puestos);
      if (!actual) continue;
      const s = norm(texto(sub[c]) ?? "");
      const tipo: TipoRegistro | null = s.startsWith("ingreso") ? "INGRESO" : s.startsWith("salida") ? "SALIDA" : null;
      if (tipo) registros.push({ col: c, puestoId: actual.id, tipo });
    }
    const tieneSubencabezado = registros.length > 0;
    return { campos, registros, filaDatos: r + (tieneSubencabezado ? 2 : 1) };
  }
  return null;
}

// ---------- lectura ----------

/**
 * Infiere el punto de partida a partir de las celdas "NA": la partida P es aquella
 * cuyas columnas "no corresponde" coinciden exactamente con las NA de la fila.
 */
export function inferirPartida(
  naPorColumna: { puestoId: string; tipo: TipoRegistro; esNA: boolean }[],
  puestos: PuestoDom[],
): PuestoDom | null {
  for (const p of puestos.filter((x) => x.esPartidaPosible).sort((a, b) => a.orden - b.orden)) {
    const ficticio = { id: "", puntoPartidaId: p.id, abandonoTrasPuestoId: null, transporteIda: null, transporteVuelta: null };
    const coincide = naPorColumna.every(({ puestoId, tipo, esNA: na }) => {
      const puesto = puestos.find((x) => x.id === puestoId)!;
      return na === !registrosPlanificados(ficticio, puesto, puestos).includes(tipo);
    });
    if (coincide) return p;
  }
  return null;
}

export function leerListado(matriz: Celda[][], puestos: PuestoDom[]): ResultadoLectura {
  const ordenados = [...puestos].sort((a, b) => a.orden - b.orden);
  const mapa = leerEncabezado(matriz, ordenados);
  if (!mapa) {
    return {
      filas: [],
      avisos: [],
      errores: [{ fila: null, mensaje: 'No se encontró el encabezado (columnas "N°" y "Apellido y nombre").' }],
    };
  }
  const errores: ErrorImportacion[] = [];
  const avisos: Aviso[] = [];
  const filas: FilaImportada[] = [];
  const primero = ordenados[0];
  const { campos } = mapa;
  const celda = (fila: Celda[], campo: Campo) => (campos[campo] === undefined ? null : fila[campos[campo]!]);

  if (mapa.registros.length === 0) {
    avisos.push({ tipo: "PARTIDA", filas: [], mensaje: "No se encontraron columnas de puestos (Ingreso/Salida): no se importan horas." });
  }

  for (let r = mapa.filaDatos; r < matriz.length; r++) {
    const fila = matriz[r] ?? [];
    const nFila = r + 1;
    const nombre = texto(celda(fila, "nombre"));
    const numeroTxt = texto(celda(fila, "numero"));
    if (!nombre && !numeroTxt) continue; // fila vacía
    if (!nombre) {
      errores.push({ fila: nFila, mensaje: `Fila ${nFila}: tiene número pero no nombre.` });
      continue;
    }
    const numero = Number(numeroTxt);
    if (!Number.isInteger(numero) || numero <= 0) {
      errores.push({ fila: nFila, mensaje: `Fila ${nFila} (${nombre}): número inválido "${numeroTxt ?? ""}".` });
      continue;
    }

    // Punto de partida: columna "Sale desde" y, como respaldo/validación, las NA.
    const nas = mapa.registros.map(({ col, puestoId, tipo }) => ({ puestoId, tipo, esNA: esNA(fila[col]) }));
    const inferida = mapa.registros.length > 0 ? inferirPartida(nas, ordenados) : null;
    const partidaTxt = texto(celda(fila, "partida"));
    const declarada = partidaTxt ? ordenados.find((p) => norm(p.nombre) === norm(partidaTxt)) : undefined;
    if (partidaTxt && !declarada?.esPartidaPosible) {
      errores.push({ fila: nFila, mensaje: `Fila ${nFila} (${nombre}): "Sale desde" desconocido: "${partidaTxt}".` });
      continue;
    }
    const partida = declarada ?? inferida;
    if (!partida) {
      errores.push({
        fila: nFila,
        mensaje: `Fila ${nFila} (${nombre}): no se pudo determinar el punto de partida (sin "Sale desde" y las NA no coinciden con ninguna partida).`,
      });
      continue;
    }
    if (declarada && mapa.registros.length > 0 && inferida?.id !== declarada.id) {
      avisos.push({
        tipo: "PARTIDA",
        filas: [nFila],
        mensaje: `Fila ${nFila} (${nombre}): "Sale desde" dice ${declarada.nombre} pero las NA ${
          inferida ? `corresponden a ${inferida.nombre}` : "no coinciden con ninguna partida"
        }. Se usa ${declarada.nombre}.`,
      });
    }

    const ida = transporte(celda(fila, "ida"));
    const vuelta = transporte(celda(fila, "vuelta"));
    for (const [campo, valor] of [
      ["ida", ida],
      ["vuelta", vuelta],
    ] as const) {
      if (valor === "invalido") {
        avisos.push({
          tipo: "TRANSPORTE",
          filas: [nFila],
          mensaje: `Fila ${nFila} (${nombre}): transporte de ${campo} no reconocido "${texto(celda(fila, campo))}" (se deja sin dato).`,
        });
      }
    }
    const idaFinal = ida === "invalido" ? null : ida;
    if (idaFinal && partida.id !== primero.id) {
      avisos.push({
        tipo: "TRANSPORTE",
        filas: [nFila],
        mensaje: `Fila ${nFila} (${nombre}): tiene "Ida a ${primero.nombre}" pero sale desde ${partida.nombre} (se ignora).`,
      });
    }

    const registros: RegistroImportado[] = [];
    for (const { col, puestoId, tipo } of mapa.registros) {
      if (esNA(fila[col])) continue;
      const h = hora(fila[col]);
      if (h === null) continue;
      if (h === "invalida") {
        avisos.push({
          tipo: "HORA",
          filas: [nFila],
          mensaje: `Fila ${nFila} (${nombre}): hora ilegible "${texto(fila[col])}" (se ignora).`,
        });
        continue;
      }
      registros.push({ puestoId, tipo, hhmm: h });
    }

    filas.push({
      fila: nFila,
      numero,
      nombreCompleto: nombre,
      dni: texto(celda(fila, "dni")),
      telefonos: separarTelefonos(texto(celda(fila, "telefono"))),
      puntoPartidaId: partida.id,
      transporteIda: partida.id === primero.id ? idaFinal : null,
      transporteVuelta: vuelta === "invalido" ? null : vuelta,
      registros,
    });
  }

  // Números repetidos: no se puede importar ninguna de las dos.
  const porNumero = Map.groupBy(filas, (f) => f.numero);
  const repetidos = new Set<number>();
  for (const [numero, grupo] of porNumero) {
    if (grupo.length > 1) {
      repetidos.add(numero);
      errores.push({
        fila: grupo[0].fila,
        mensaje: `El número ${numero} está repetido (filas ${grupo.map((f) => f.fila).join(", ")}). Corregilo en la planilla.`,
      });
    }
  }
  const validas = filas.filter((f) => !repetidos.has(f.numero));
  return { filas: validas, avisos: [...avisos, ...detectarAvisos(validas)], errores };
}

// ---------- advertencias ----------

function tokens(nombre: string): Set<string> {
  return new Set(norm(nombre).split(/[\s,.-]+/).filter((t) => t.length > 1));
}

/** Mismas palabras en cualquier orden, o una contiene todas las de la otra (≥ 2 palabras). */
export function nombresParecidos(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  const comunes = [...ta].filter((t) => tb.has(t)).length;
  const menor = Math.min(ta.size, tb.size);
  return menor >= 2 && comunes === menor;
}

export function detectarAvisos(filas: FilaImportada[]): Aviso[] {
  const avisos: Aviso[] = [];
  const desc = (f: FilaImportada) => `#${f.numero} "${f.nombreCompleto}" (fila ${f.fila})`;
  const pares = new Set<string>();

  for (let i = 0; i < filas.length; i++) {
    for (let j = i + 1; j < filas.length; j++) {
      const a = filas[i];
      const b = filas[j];
      const telA = new Set(a.telefonos.map(digitosTelefono).filter((d) => d.length >= 8));
      const telComun = b.telefonos.map(digitosTelefono).some((d) => telA.has(d));
      const mismoDni = !!a.dni && !!b.dni && digitosTelefono(a.dni) === digitosTelefono(b.dni);
      const parecidos = nombresParecidos(a.nombreCompleto, b.nombreCompleto);
      const clave = `${a.fila}-${b.fila}`;
      if (mismoDni || parecidos) {
        const motivo = [mismoDni && "mismo DNI", parecidos && "nombre parecido", telComun && "mismo teléfono"]
          .filter(Boolean)
          .join(" + ");
        avisos.push({ tipo: "DUPLICADO", filas: [a.fila, b.fila], mensaje: `Posible duplicado (${motivo}): ${desc(a)} y ${desc(b)}.` });
        pares.add(clave);
      } else if (telComun) {
        avisos.push({
          tipo: "TELEFONO_COMPARTIDO",
          filas: [a.fila, b.fila],
          mensaje: `Teléfono compartido (puede ser de la familia, a confirmar): ${desc(a)} y ${desc(b)}.`,
        });
      }
    }
  }

  for (const f of filas) {
    if (f.telefonos.length > 1) {
      avisos.push({
        tipo: "VARIOS_TELEFONOS",
        filas: [f.fila],
        mensaje: `${desc(f)} tiene ${f.telefonos.length} teléfonos: ${f.telefonos.join(" / ")} (se guardan todos).`,
      });
    }
    const noAmba = f.telefonos.filter((t) => !esTelefonoAmba(t));
    if (noAmba.length > 0) {
      avisos.push({
        tipo: "NO_AMBA",
        filas: [f.fila],
        mensaje: `${desc(f)}: teléfono con formato no AMBA "${noAmba.join(" / ")}" (se deja tal cual).`,
      });
    }
  }
  return avisos;
}

// ---------- horas → fecha ----------

/**
 * Las horas de la planilla no tienen fecha. Recorriendo el trayecto de cada caminante:
 * la primera hora es del día de inicio, salvo que sea anterior a `corte` (entonces es
 * del día siguiente); cada hora siguiente que "retrocede" pasa al día siguiente.
 */
export function asignarFechas(
  registros: RegistroImportado[],
  puestos: PuestoDom[],
  fechaInicio: string,
  corte: string,
): { puestoId: string; tipo: TipoRegistro; hora: Date }[] {
  const orden = (r: RegistroImportado) =>
    (puestos.find((p) => p.id === r.puestoId)?.orden ?? 0) * 2 + (r.tipo === "SALIDA" ? 1 : 0);
  const ordenados = [...registros].sort((a, b) => orden(a) - orden(b));
  const base = conHora(new Date(`${fechaInicio}T12:00:00-03:00`), "12:00");
  let dias = 0;
  let anterior: string | null = null;
  return ordenados.map((r) => {
    if (anterior === null) dias = r.hhmm < corte ? 1 : 0;
    else if (r.hhmm < anterior) dias++;
    anterior = r.hhmm;
    const dia = new Date(base.getTime() + dias * 86_400_000);
    return { puestoId: r.puestoId, tipo: r.tipo, hora: conHora(dia, r.hhmm) };
  });
}

