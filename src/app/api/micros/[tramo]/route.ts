import { NextResponse, type NextRequest } from "next/server";
import { tieneAcceso } from "@/lib/acceso";
import { cargarDatosMicro } from "@/lib/micros";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/micros/[tramo]">) {
  if (!(await tieneAcceso())) return NextResponse.json({ error: "Sin acceso: ingresá el código de nuevo." }, { status: 401 });
  const { tramo } = await ctx.params;
  const t = tramo.toUpperCase();
  if (t !== "IDA" && t !== "VUELTA") return NextResponse.json({ error: "Tramo inválido." }, { status: 404 });
  const datos = await cargarDatosMicro(t);
  if (!datos) return NextResponse.json({ error: "No hay peregrinación activa." }, { status: 404 });
  return NextResponse.json(datos, { headers: { "Cache-Control": "no-store" } });
}
