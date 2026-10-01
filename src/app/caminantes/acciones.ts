"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { separarTelefonos } from "@/domain/telefonos";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { exigirAcceso } from "@/lib/acceso";

export interface ResultadoForm {
  error?: string;
  ok?: string;
}

const opcional = z
  .string()
  .trim()
  .transform((s) => s || null)
  .nullable();
const transporte = z
  .enum(["MICRO", "POR_SU_CUENTA", ""])
  .transform((s) => s || null)
  .nullable();

const esquemaCaminante = z.object({
  id: opcional,
  numero: z.coerce.number().int("El número debe ser entero.").positive("El número debe ser mayor a 0."),
  nombreCompleto: z.string().trim().min(1, "Falta el nombre."),
  telefonos: z.string().transform(separarTelefonos),
  dni: opcional,
  puntoPartidaId: z.string().min(1, "Falta el punto de partida."),
  transporteIda: transporte,
  transporteVuelta: transporte,
  notas: opcional,
});

export async function guardarCaminante(_prev: ResultadoForm, form: FormData): Promise<ResultadoForm> {
  await exigirAcceso();
  const datos = esquemaCaminante.safeParse({
    id: form.get("id"),
    numero: form.get("numero"),
    nombreCompleto: form.get("nombreCompleto"),
    telefonos: form.get("telefonos") ?? "",
    dni: form.get("dni"),
    puntoPartidaId: form.get("puntoPartidaId"),
    transporteIda: form.get("transporteIda"),
    transporteVuelta: form.get("transporteVuelta"),
    notas: form.get("notas"),
  });
  if (!datos.success) return { error: datos.error.issues[0].message };
  const { id, ...d } = datos.data;

  const peregrinacion = await prisma.peregrinacion.findFirst({
    where: { activa: true },
    include: { puestos: { orderBy: { orden: "asc" } } },
  });
  if (!peregrinacion) return { error: "No hay ninguna peregrinación activa." };
  const partida = peregrinacion.puestos.find((p) => p.id === d.puntoPartidaId);
  if (!partida?.esPartidaPosible) return { error: "Ese puesto no es un punto de partida." };
  // La ida a Liniers solo aplica a quienes parten del primer puesto.
  const transporteIda = partida.id === peregrinacion.puestos[0].id ? d.transporteIda : null;
  const data = { ...d, transporteIda };

  let nuevoId: string | null = null;
  try {
    if (id) {
      await prisma.caminante.update({ where: { id }, data });
    } else {
      const creado = await prisma.caminante.create({ data: { ...data, peregrinacionId: peregrinacion.id } });
      nuevoId = creado.id;
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `Ya existe un caminante con el número ${d.numero}.` };
    }
    throw e;
  }
  if (nuevoId) redirect(`/caminantes/${nuevoId}`);
  refresh();
  return { ok: "Datos guardados." };
}

/** Marca (o quita, con puestoId vacío) el abandono "después del puesto X". */
export async function marcarAbandono(_prev: ResultadoForm, form: FormData): Promise<ResultadoForm> {
  await exigirAcceso();
  const caminanteId = String(form.get("caminanteId") ?? "");
  const puestoId = String(form.get("puestoId") ?? "") || null;
  const caminante = await prisma.caminante.findUnique({
    where: { id: caminanteId },
    include: { puntoPartida: true, peregrinacion: { include: { puestos: true } } },
  });
  if (!caminante) return { error: "El caminante no existe." };
  if (puestoId) {
    const puesto = caminante.peregrinacion.puestos.find((p) => p.id === puestoId);
    if (!puesto || puesto.orden < caminante.puntoPartida.orden) {
      return { error: "Ese puesto está antes de su punto de partida." };
    }
  }
  await prisma.caminante.update({
    where: { id: caminanteId },
    data: { abandonoTrasPuestoId: puestoId, abandonoHora: puestoId ? new Date() : null },
  });
  refresh();
  return { ok: puestoId ? "Abandono registrado." : "Abandono quitado." };
}

export async function eliminarCaminante(form: FormData) {
  await exigirAcceso();
  const id = String(form.get("id") ?? "");
  await prisma.caminante.deleteMany({ where: { id } });
  redirect("/tablero");
}
