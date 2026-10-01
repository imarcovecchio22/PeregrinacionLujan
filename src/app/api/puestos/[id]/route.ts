import { NextResponse, type NextRequest } from "next/server";
import { cargarDatosPuesto } from "@/lib/mi-puesto";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/puestos/[id]">) {
  const { id } = await ctx.params;
  const datos = await cargarDatosPuesto(id);
  if (!datos) return NextResponse.json({ error: "Puesto inexistente." }, { status: 404 });
  return NextResponse.json(datos, { headers: { "Cache-Control": "no-store" } });
}
