// Teléfonos: se guardan tal cual vinieron (no se normalizan formatos), solo se separan
// cuando hay varios en una misma celda/campo ("/", saltos de línea o ";").

export function separarTelefonos(texto: string | null | undefined): string[] {
  if (!texto) return [];
  return String(texto)
    .split(/[/\n;]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** Solo dígitos, para comparar teléfonos escritos con formatos distintos. */
export function digitosTelefono(t: string): string {
  return t.replace(/\D/g, "");
}

/**
 * ¿Parece un celular/fijo de CABA o AMBA? (código 11, con o sin 54/9/15).
 * Solo se usa para advertir; nunca se modifica el valor.
 */
export function esTelefonoAmba(t: string): boolean {
  let d = digitosTelefono(t);
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9")) d = d.slice(1);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.startsWith("11")) return d.length === 10 || (d.length === 12 && d.slice(2, 4) === "15");
  // 15-xxxx-xxxx sin característica (se asume AMBA)
  return d.length === 10 && d.startsWith("15");
}
