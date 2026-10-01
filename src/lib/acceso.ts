import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

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
