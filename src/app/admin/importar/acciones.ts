"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { importar, previsualizar, type OpcionesImportacion, type Previsualizacion } from "@/lib/importacion";
import { exigirAdmin } from "@/lib/acceso";

const MAX_BYTES = 5 * 1024 * 1024;

const esquema = z.discriminatedUnion("destino", [
  z.object({
    destino: z.literal("NUEVA"),
    nombre: z.string().trim().min(1, "Poné un nombre para la peregrinación nueva."),
    fechaInicio: z.iso.date("Poné la fecha de inicio."),
    corte: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  z.object({
    destino: z.literal("REEMPLAZAR"),
    nombre: z.string().optional().default(""),
    fechaInicio: z.string().optional().default(""),
    corte: z.string().regex(/^\d{2}:\d{2}$/),
  }),
]);

function leerForm(form: FormData): { archivo: File; opciones: OpcionesImportacion } | { error: string } {
  const archivo = form.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elegí un archivo .xlsx o .csv." };
  if (archivo.size > MAX_BYTES) return { error: "El archivo es demasiado grande (máximo 5 MB)." };
  const op = esquema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!op.success) return { error: op.error.issues[0].message };
  return { archivo, opciones: op.data };
}

export async function previsualizarImportacion(form: FormData): Promise<{ error: string } | { previa: Previsualizacion }> {
  await exigirAdmin();
  const datos = leerForm(form);
  if ("error" in datos) return datos;
  try {
    return { previa: await previsualizar(datos.archivo, datos.opciones) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo leer el archivo." };
  }
}

export async function confirmarImportacion(form: FormData): Promise<{ error: string }> {
  await exigirAdmin();
  const datos = leerForm(form);
  if ("error" in datos) return datos;
  try {
    await importar(datos.archivo, datos.opciones);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo importar." };
  }
  redirect("/tablero");
}
