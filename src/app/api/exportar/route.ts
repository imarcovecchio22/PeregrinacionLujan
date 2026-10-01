import { NextResponse, type NextRequest } from "next/server";
import type { Tramo } from "@/domain/micros";
import { prisma } from "@/lib/db";
import { generarPlanilla } from "@/lib/excel-exportar";
import { tieneAcceso } from "@/lib/acceso";

/** Descarga la planilla (formato de la hoja "Listado") de la peregrinación activa o de ?id=. */
export async function GET(req: NextRequest) {
  if (!(await tieneAcceso())) return NextResponse.json({ error: "Sin acceso: ingresá el código de nuevo." }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  const p = await prisma.peregrinacion.findFirst({
    where: id ? { id } : { activa: true },
    include: {
      puestos: { orderBy: { orden: "asc" } },
      caminantes: { orderBy: { numero: "asc" } },
    },
  });
  if (!p) return NextResponse.json({ error: "No hay peregrinación para exportar." }, { status: 404 });
  const registros = await prisma.registro.findMany({ where: { caminante: { peregrinacionId: p.id } } });
  const abordajes = await prisma.abordaje.findMany({ where: { caminante: { peregrinacionId: p.id } } });
  const subieron = (t: Tramo) => new Set(abordajes.filter((a) => a.tramo === t).map((a) => a.caminanteId));

  const buffer = await generarPlanilla({
    nombre: p.nombre,
    puestos: p.puestos,
    caminantes: p.caminantes,
    registros,
    abordajes: { IDA: subieron("IDA"), VUELTA: subieron("VUELTA"), CHECKIN: subieron("CHECKIN") },
  });
  const archivo = `${p.nombre.replace(/[\\/:*?"<>|]/g, "")}.xlsx`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="planilla.xlsx"; filename*=UTF-8''${encodeURIComponent(archivo)}`,
      "Cache-Control": "no-store",
    },
  });
}
