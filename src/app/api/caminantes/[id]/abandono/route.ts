import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { tieneAcceso } from "@/lib/acceso";
import { ErrorDominio, guardarAbandono } from "@/lib/registros";

const esquema = z.object({ puestoId: z.string().min(1).nullable() });

/** Marca o quita (puestoId: null) el abandono. Lo usa "Mi puesto". */
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/caminantes/[id]/abandono">) {
  if (!(await tieneAcceso())) return NextResponse.json({ error: "Sin acceso: ingresá el código de nuevo." }, { status: 401 });
  const { id } = await ctx.params;
  const datos = esquema.safeParse(await req.json().catch(() => null));
  if (!datos.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  try {
    await guardarAbandono(id, datos.data.puestoId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ErrorDominio) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Error del servidor." }, { status: 500 });
  }
}
