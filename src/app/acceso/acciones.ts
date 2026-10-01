"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { codigoCorrecto, COOKIE_ACCESO, DURACION_ACCESO_S, tokenAcceso } from "@/lib/acceso";
import { prisma } from "@/lib/db";

const VENTANA_MS = 15 * 60 * 1000;
const MAX_POR_IP = 10;
const MAX_TOTAL = 100; // contra intentos repartidos entre muchas IPs

export async function ingresar(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const intento = String(form.get("codigo") ?? "");
  const siguiente = String(form.get("siguiente") ?? "/");
  if (!tokenAcceso()) return { error: "La app no tiene configurado un código de acceso (ACCESO_CODIGO)." };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "desconocida";
  const desde = new Date(Date.now() - VENTANA_MS);
  const [porIp, total] = await Promise.all([
    prisma.intentoAcceso.count({ where: { ip, createdAt: { gte: desde } } }),
    prisma.intentoAcceso.count({ where: { createdAt: { gte: desde } } }),
  ]);
  if (porIp >= MAX_POR_IP || total >= MAX_TOTAL) {
    return { error: "Demasiados intentos fallidos. Esperá 15 minutos." };
  }

  if (!codigoCorrecto(intento)) {
    await prisma.intentoAcceso.create({ data: { ip } });
    await prisma.intentoAcceso.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
    return { error: "Código incorrecto." };
  }

  (await cookies()).set(COOKIE_ACCESO, tokenAcceso()!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_ACCESO_S,
  });
  // Solo rutas internas (evita redirecciones a otros sitios).
  redirect(siguiente.startsWith("/") && !siguiente.startsWith("//") ? siguiente : "/");
}

export async function salir() {
  (await cookies()).delete(COOKIE_ACCESO);
  redirect("/acceso");
}
