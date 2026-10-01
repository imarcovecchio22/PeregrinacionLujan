// Lógica pura de la vista "Mi puesto": combinar datos del servidor con cambios locales
// todavía no confirmados, agrupar faltantes primero y buscar.

import { registrosVigentes, rolEnPuesto, type RolEnPuesto } from "@/domain/recorrido";
import type { PuestoDom, TipoRegistro } from "@/domain/tipos";
import type { FilaPuesto, RegistroApi } from "./tipos-api";

/** Cambio local pendiente de confirmar por el servidor (un registro o el abandono). */
export type CambioLocal =
  | { accion: "guardar"; registro: RegistroApi }
  | { accion: "borrar"; registro: RegistroApi }
  | { accion: "abandono"; caminanteId: string; puestoId: string | null };

export type ClaveTipo = TipoRegistro | "ABANDONO";
export const claveCambio = (caminanteId: string, tipo: ClaveTipo) => `${caminanteId}:${tipo}`;

export function caminanteDe(c: CambioLocal): string {
  return c.accion === "abandono" ? c.caminanteId : c.registro.caminanteId;
}

export function claveDe(c: CambioLocal): string {
  return c.accion === "abandono" ? claveCambio(c.caminanteId, "ABANDONO") : claveCambio(c.registro.caminanteId, c.registro.tipo);
}

/** Aplica los cambios locales sobre los datos del servidor. */
export function combinar(filas: FilaPuesto[], cambios: Map<string, CambioLocal>): FilaPuesto[] {
  if (cambios.size === 0) return filas;
  return filas.map((f) => {
    let registros = f.registros;
    for (const tipo of ["INGRESO", "SALIDA"] as const) {
      const cambio = cambios.get(claveCambio(f.caminante.id, tipo));
      if (!cambio || cambio.accion === "abandono") continue;
      registros = registros.filter((r) => r.tipo !== tipo);
      if (cambio.accion === "guardar") registros = [...registros, cambio.registro];
    }
    const abandono = cambios.get(claveCambio(f.caminante.id, "ABANDONO"));
    const caminante =
      abandono?.accion === "abandono" ? { ...f.caminante, abandonoTrasPuestoId: abandono.puestoId } : f.caminante;
    return registros === f.registros && caminante === f.caminante ? f : { ...f, caminante, registros };
  });
}

/**
 * Puesto a registrar como "abandonó después de…" al tocar Abandonó en este puesto:
 * si ya ingresó (o parte de acá), este puesto; si todavía no llegó, el anterior de su recorrido.
 */
export function puestoAbandono(fila: FilaVista, puesto: PuestoDom, puestos: PuestoDom[]): PuestoDom {
  if (fila.rol === "PARTIDA" || fila.registro("INGRESO") || !puesto.registraIngreso) return puesto;
  const partida = puestos.find((p) => p.id === fila.caminante.puntoPartidaId)!;
  const anteriores = puestos.filter((p) => p.orden < puesto.orden && p.orden >= partida.orden);
  return anteriores.sort((a, b) => b.orden - a.orden)[0] ?? puesto;
}

export type Grupo = "SIN_GUARDAR" | "FALTAN_LLEGAR" | "EN_EL_PUESTO" | "COMPLETOS" | "ABANDONARON";

export interface FilaVista extends FilaPuesto {
  rol: RolEnPuesto;
  /** Registros que todavía se esperan y no están hechos, en orden. */
  pendientes: TipoRegistro[];
  grupo: Grupo;
  registro: (tipo: TipoRegistro) => RegistroApi | undefined;
}

export function armarFila(f: FilaPuesto, puesto: PuestoDom, puestos: PuestoDom[]): FilaVista {
  const rol = rolEnPuesto(f.caminante, puesto, puestos);
  const registro = (tipo: TipoRegistro) => f.registros.find((r) => r.tipo === tipo);
  const pendientes = registrosVigentes(f.caminante, puesto, puestos).filter((t) => !registro(t));
  let grupo: Grupo;
  if (pendientes.length === 0) grupo = f.caminante.abandonoTrasPuestoId ? "ABANDONARON" : "COMPLETOS";
  else if (pendientes.includes("INGRESO") || rol === "PARTIDA") grupo = "FALTAN_LLEGAR";
  else grupo = "EN_EL_PUESTO";
  return { ...f, rol, pendientes, grupo, registro };
}

export const ORDEN_GRUPOS: Grupo[] = ["SIN_GUARDAR", "FALTAN_LLEGAR", "EN_EL_PUESTO", "COMPLETOS", "ABANDONARON"];

/**
 * Agrupa faltantes primero. Las filas con un guardado fallido van arriba de todo, para que
 * el error nunca quede escondido en un grupo plegado. `fijas` mantiene una fila en el grupo
 * donde estaba mientras se guarda (si no, "salta" y no se ve la confirmación).
 */
export function agrupar(
  filas: FilaVista[],
  conError: Set<string> = new Set(),
  fijas: Map<string, Grupo> = new Map(),
): Record<Grupo, FilaVista[]> {
  const res: Record<Grupo, FilaVista[]> = { SIN_GUARDAR: [], FALTAN_LLEGAR: [], EN_EL_PUESTO: [], COMPLETOS: [], ABANDONARON: [] };
  for (const f of filas) {
    const id = f.caminante.id;
    res[conError.has(id) ? "SIN_GUARDAR" : (fijas.get(id) ?? f.grupo)].push(f);
  }
  for (const g of ORDEN_GRUPOS) res[g].sort((a, b) => a.caminante.numero - b.caminante.numero);
  return res;
}

export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // saca los acentos que NFD separó
    .toLowerCase()
    .trim();
}

/** Busca por número (exacto), nombre (todas las palabras, sin acentos) o teléfono (dígitos). */
export function coincide(f: FilaPuesto, busqueda: string): boolean {
  const q = normalizar(busqueda);
  if (!q) return true;
  if (/^#?\d{1,4}$/.test(q)) return String(f.caminante.numero) === q.replace("#", "");
  const nombre = normalizar(f.caminante.nombreCompleto);
  if (q.split(/\s+/).every((palabra) => nombre.includes(palabra))) return true;
  const digitos = q.replace(/\D/g, "");
  return digitos.length >= 4 && f.caminante.telefonos.some((t) => t.replace(/\D/g, "").includes(digitos));
}

/** href para llamar: deja solo dígitos (y el + inicial). */
export function hrefTelefono(tel: string): string | null {
  const limpio = tel.trim().replace(/(?!^\+)[^\d]/g, "");
  return limpio.replace("+", "").length >= 6 ? `tel:${limpio}` : null;
}
