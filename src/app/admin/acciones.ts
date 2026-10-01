"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { PUESTOS_DEFAULT } from "@/domain/puestos-default";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { exigirAcceso } from "@/lib/acceso";

export interface ResultadoAdmin {
  error?: string;
  ok?: string;
}

const esquemaPeregrinacion = z.object({
  id: z.string().optional(),
  nombre: z.string().trim().min(1, "Falta el nombre."),
  fechaInicio: z.iso.date("Fecha inválida."),
});

/** Crea (sin id, con los puestos de la activa y sin caminantes) o edita una peregrinación. */
export async function guardarPeregrinacion(_prev: ResultadoAdmin, form: FormData): Promise<ResultadoAdmin> {
  await exigirAcceso();
  const d = esquemaPeregrinacion.safeParse({
    id: form.get("id") || undefined,
    nombre: form.get("nombre"),
    fechaInicio: form.get("fechaInicio"),
  });
  if (!d.success) return { error: d.error.issues[0].message };
  const { id, nombre, fechaInicio } = d.data;
  if (id) {
    await prisma.peregrinacion.update({ where: { id }, data: { nombre, fechaInicio: new Date(fechaInicio) } });
    refresh();
    return { ok: "Guardado." };
  }
  const activa = await prisma.peregrinacion.findFirst({ where: { activa: true }, include: { puestos: true } });
  const puestos = activa?.puestos.length ? activa.puestos : PUESTOS_DEFAULT;
  await prisma.$transaction([
    prisma.peregrinacion.updateMany({ data: { activa: false } }),
    prisma.peregrinacion.create({
      data: {
        nombre,
        fechaInicio: new Date(fechaInicio),
        activa: true,
        puestos: {
          create: puestos.map(({ orden, nombre, esPartidaPosible, registraIngreso, registraSalida, horaCheckin }) => ({
            orden,
            nombre,
            esPartidaPosible,
            registraIngreso,
            registraSalida,
            horaCheckin,
          })),
        },
      },
    }),
  ]);
  refresh();
  return { ok: `Creada «${nombre}» (es la activa).` };
}

export async function activarPeregrinacion(form: FormData) {
  await exigirAcceso();
  const id = String(form.get("id") ?? "");
  await prisma.$transaction([
    prisma.peregrinacion.updateMany({ data: { activa: false } }),
    prisma.peregrinacion.update({ where: { id }, data: { activa: true } }),
  ]);
  refresh();
}

export async function eliminarPeregrinacion(form: FormData) {
  await exigirAcceso();
  const id = String(form.get("id") ?? "");
  // Nunca se borra la activa desde acá.
  await prisma.peregrinacion.deleteMany({ where: { id, activa: false } });
  refresh();
}

const esquemaPuesto = z.object({
  id: z.string().min(1),
  nombre: z.string().trim().min(1, "Falta el nombre del puesto."),
  esPartidaPosible: z.boolean(),
  registraIngreso: z.boolean(),
  registraSalida: z.boolean(),
  horaCheckin: z
    .string()
    .trim()
    .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "La hora de check-in tiene que ser HH:mm (ej. 07:00).")
    .transform((h) => h.padStart(5, "0"))
    .nullable(),
});

export async function guardarPuesto(_prev: ResultadoAdmin, form: FormData): Promise<ResultadoAdmin> {
  await exigirAcceso();
  const d = esquemaPuesto.safeParse({
    id: form.get("id"),
    nombre: form.get("nombre"),
    esPartidaPosible: form.get("esPartidaPosible") === "on",
    registraIngreso: form.get("registraIngreso") === "on",
    registraSalida: form.get("registraSalida") === "on",
    horaCheckin: String(form.get("horaCheckin") ?? "").trim() || null,
  });
  if (!d.success) return { error: d.error.issues[0].message };
  const { id, ...data } = d.data;
  if (!data.esPartidaPosible) data.horaCheckin = null;
  if (!data.registraIngreso && !data.registraSalida) return { error: "El puesto tiene que registrar Ingreso o Salida." };
  if (!data.esPartidaPosible) {
    const parten = await prisma.caminante.count({ where: { puntoPartidaId: id } });
    if (parten > 0) {
      return { error: `No puede dejar de ser partida: ${parten === 1 ? "1 caminante sale" : `${parten} caminantes salen`} de acá.` };
    }
  }
  try {
    await prisma.puesto.update({ where: { id }, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Ya hay un puesto con ese nombre." };
    throw e;
  }
  refresh();
  return { ok: "Guardado." };
}
