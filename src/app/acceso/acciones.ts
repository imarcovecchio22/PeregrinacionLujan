"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  codigoAdminCorrecto,
  codigoCorrecto,
  COOKIE_ACCESO,
  COOKIE_ADMIN,
  DURACION_ACCESO_S,
  tieneAcceso,
  tokenAcceso,
  tokenAdmin,
} from "@/lib/acceso";
import { prisma } from "@/lib/db";

const VENTANA_MS = 15 * 60 * 1000;
const MAX_POR_IP = 10;
const MAX_TOTAL = 100; // contra intentos repartidos entre muchas IPs

/** Valida el código contando los fallos por IP y en total. Devuelve el error, o null si es correcto. */
async function verificarIntento(correcto: boolean): Promise<string | null> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "desconocida";
  const desde = new Date(Date.now() - VENTANA_MS);
  const [porIp, total] = await Promise.all([
    prisma.intentoAcceso.count({ where: { ip, createdAt: { gte: desde } } }),
    prisma.intentoAcceso.count({ where: { createdAt: { gte: desde } } }),
  ]);
  if (porIp >= MAX_POR_IP || total >= MAX_TOTAL) return "Demasiados intentos fallidos. Esperá 15 minutos.";

  if (!correcto) {
    await prisma.intentoAcceso.create({ data: { ip } });
    await prisma.intentoAcceso.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
    return "Código incorrecto.";
  }
  return null;
}

async function guardarCookie(nombre: string, token: string) {
  (await cookies()).set(nombre, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_ACCESO_S,
  });
}

/** Solo rutas internas (evita redirecciones a otros sitios). */
function destino(siguiente: string): string {
  return siguiente.startsWith("/") && !siguiente.startsWith("//") ? siguiente : "/";
}

export async function ingresar(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const intento = String(form.get("codigo") ?? "");
  const siguiente = String(form.get("siguiente") ?? "/");
  if (!tokenAcceso()) return { error: "La app no tiene configurado un código de acceso (ACCESO_CODIGO)." };

  const error = await verificarIntento(codigoCorrecto(intento));
  if (error) return { error };
  await guardarCookie(COOKIE_ACCESO, tokenAcceso()!);
  redirect(destino(siguiente));
}

export async function ingresarAdmin(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const intento = String(form.get("codigo") ?? "");
  const siguiente = String(form.get("siguiente") ?? "/admin");
  if (!(await tieneAcceso())) redirect("/acceso");
  if (!tokenAdmin()) return { error: "La app no tiene configurado un código de administrador (ADMIN_CODIGO)." };

  const error = await verificarIntento(codigoAdminCorrecto(intento));
  if (error) return { error };
  await guardarCookie(COOKIE_ADMIN, tokenAdmin()!);
  redirect(destino(siguiente));
}

export async function salirAdmin() {
  (await cookies()).delete(COOKIE_ADMIN);
  redirect("/");
}

export async function salir() {
  const c = await cookies();
  c.delete(COOKIE_ACCESO);
  c.delete(COOKIE_ADMIN);
  redirect("/acceso");
}
