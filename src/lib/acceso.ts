import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Acceso con un código compartido (sin usuarios). El celular que lo ingresa recibe una
// cookie con un token derivado del código: si se cambia ACCESO_CODIGO, todas las
// sesiones dejan de valer.

export const COOKIE_ACCESO = "acceso";
export const DURACION_ACCESO_S = 60 * 60 * 24 * 60; // 60 días

function codigo(): string | null {
  return process.env.ACCESO_CODIGO?.trim() || null;
}

/** En desarrollo, sin código configurado no se pide (en producción es obligatorio). */
export function accesoDesactivado(): boolean {
  return !codigo() && process.env.NODE_ENV !== "production";
}

export function tokenAcceso(): string | null {
  const c = codigo();
  return c ? createHmac("sha256", c).update("peregrinacion-lujan:acceso:v1").digest("hex") : null;
}

function iguales(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function tokenValido(valor: string | undefined): boolean {
  if (accesoDesactivado()) return true;
  const esperado = tokenAcceso();
  return !!esperado && !!valor && iguales(valor, esperado);
}

export function codigoCorrecto(intento: string): boolean {
  const c = codigo();
  return !!c && iguales(intento.trim(), c);
}

/** Para Server Actions y Route Handlers: no depender solo del proxy. */
export async function tieneAcceso(): Promise<boolean> {
  return tokenValido((await cookies()).get(COOKIE_ACCESO)?.value);
}

export async function exigirAcceso(): Promise<void> {
  if (!(await tieneAcceso())) throw new Error("Sin acceso: ingresá el código de nuevo.");
}

// Administrador: un segundo código (ADMIN_CODIGO) para Admin, alta y baja de caminantes y
// la descarga de la planilla. Misma mecánica, con su propia cookie; se suma al acceso común.

export const COOKIE_ADMIN = "admin";

function codigoAdmin(): string | null {
  return process.env.ADMIN_CODIGO?.trim() || null;
}

/** En desarrollo, sin código de admin configurado todos son admin (en producción es obligatorio). */
function adminDesactivado(): boolean {
  return !codigoAdmin() && process.env.NODE_ENV !== "production";
}

export function tokenAdmin(): string | null {
  const c = codigoAdmin();
  return c ? createHmac("sha256", c).update("peregrinacion-lujan:admin:v1").digest("hex") : null;
}

export function codigoAdminCorrecto(intento: string): boolean {
  const c = codigoAdmin();
  return !!c && iguales(intento.trim(), c);
}

export async function esAdmin(): Promise<boolean> {
  if (!(await tieneAcceso())) return false;
  if (adminDesactivado()) return true;
  const esperado = tokenAdmin();
  const valor = (await cookies()).get(COOKIE_ADMIN)?.value;
  return !!esperado && !!valor && iguales(valor, esperado);
}

export async function exigirAdmin(): Promise<void> {
  if (!(await esAdmin())) throw new Error("Solo el administrador puede hacer esto.");
}

/** Para las páginas de administrador: si no lo es, lo manda a ingresar el código. */
export async function exigirAdminPagina(siguiente: string): Promise<void> {
  if (!(await esAdmin())) redirect(`/admin/ingresar?siguiente=${encodeURIComponent(siguiente)}`);
}
