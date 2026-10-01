import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { borrarRegistro, ErrorDominio, esquemaRegistro, guardarRegistro } from "@/lib/registros";

const esquemaId = z.uuid();

function error(e: unknown) {
  if (e instanceof ErrorDominio) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/registros/[id]">) {
  const { id } = await ctx.params;
  if (!esquemaId.safeParse(id).success) return NextResponse.json({ error: "Id inválido." }, { status: 400 });
  const datos = esquemaRegistro.safeParse(await req.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  try {
    return NextResponse.json(await guardarRegistro(id, datos.data));
  } catch (e) {
    return error(e);
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/registros/[id]">) {
  const { id } = await ctx.params;
  try {
    await borrarRegistro(id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return error(e);
  }
}
