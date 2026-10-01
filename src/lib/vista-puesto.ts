// Lógica pura de la vista "Mi puesto": combinar datos del servidor con cambios locales
// todavía no confirmados, agrupar faltantes primero y buscar.

import { registrosVigentes, rolEnPuesto, type RolEnPuesto } from "@/domain/recorrido";
import type { PuestoDom, TipoRegistro } from "@/domain/tipos";
import type { FilaPuesto, RegistroApi } from "./tipos-api";

/** Cambio local pendiente de confirmar por el servidor, por caminante + tipo. */
export type CambioLocal = { accion: "guardar"; registro: RegistroApi } | { accion: "borrar"; registro: RegistroApi };

export const claveCambio = (caminanteId: string, tipo: TipoRegistro) => `${caminanteId}:${tipo}`;

/** Aplica los cambios locales sobre los registros del servidor. */
export function combinar(filas: FilaPuesto[], cambios: Map<string, CambioLocal>): FilaPuesto[] {
  if (cambios.size === 0) return filas;
  return filas.map((f) => {
    let registros = f.registros;
    for (const tipo of ["INGRESO", "SALIDA"] as const) {
      const cambio = cambios.get(claveCambio(f.caminante.id, tipo));
      if (!cambio) continue;
      registros = registros.filter((r) => r.tipo !== tipo);
      if (cambio.accion === "guardar") registros = [...registros, cambio.registro];
    }
    return registros === f.registros ? f : { ...f, registros };
  });
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
 * Agrupa faltantes primero. Las filas con un guardado fallido van arriba de todo,
 * para que el error nunca quede escondido en un grupo plegado.
 */
export function agrupar(filas: FilaVista[], conError: Set<string> = new Set()): Record<Grupo, FilaVista[]> {
  const res: Record<Grupo, FilaVista[]> = { SIN_GUARDAR: [], FALTAN_LLEGAR: [], EN_EL_PUESTO: [], COMPLETOS: [], ABANDONARON: [] };
  for (const f of filas) res[conError.has(f.caminante.id) ? "SIN_GUARDAR" : f.grupo].push(f);
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
