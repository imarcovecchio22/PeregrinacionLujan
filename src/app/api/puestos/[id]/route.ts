import { NextResponse, type NextRequest } from "next/server";
import { cargarDatosPuesto } from "@/lib/mi-puesto";
import { tieneAcceso } from "@/lib/acceso";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/puestos/[id]">) {
  if (!(await tieneAcceso())) return NextResponse.json({ error: "Sin acceso: ingresá el código de nuevo." }, { status: 401 });
  const { id } = await ctx.params;
  const datos = await cargarDatosPuesto(id);
  if (!datos) return NextResponse.json({ error: "Puesto inexistente." }, { status: 404 });
  return NextResponse.json(datos, { headers: { "Cache-Control": "no-store" } });
}
