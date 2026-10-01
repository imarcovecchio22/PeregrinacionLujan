import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { tieneAcceso } from "@/lib/acceso";
import { borrarAbordaje, esquemaAbordaje, guardarAbordaje } from "@/lib/micros";
import { ErrorDominio } from "@/lib/registros";

const esquemaId = z.uuid();

function error(e: unknown) {
  if (e instanceof ErrorDominio) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/abordajes/[id]">) {
  if (!(await tieneAcceso())) return NextResponse.json({ error: "Sin acceso: ingresá el código de nuevo." }, { status: 401 });
  const { id } = await ctx.params;
  if (!esquemaId.safeParse(id).success) return NextResponse.json({ error: "Id inválido." }, { status: 400 });
  const datos = esquemaAbordaje.safeParse(await req.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  try {
    return NextResponse.json(await guardarAbordaje(id, datos.data));
  } catch (e) {
    return error(e);
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/abordajes/[id]">) {
  if (!(await tieneAcceso())) return NextResponse.json({ error: "Sin acceso: ingresá el código de nuevo." }, { status: 401 });
  const { id } = await ctx.params;
  try {
    await borrarAbordaje(id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return error(e);
  }
}
