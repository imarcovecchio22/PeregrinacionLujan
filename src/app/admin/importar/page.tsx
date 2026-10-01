import { connection } from "next/server";
import { Importador } from "@/components/admin/Importador";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";

export default async function PaginaImportar() {
  await connection();
  const activa = await prisma.peregrinacion.findFirst({ where: { activa: true }, select: { nombre: true } });
  const anio = new Date().getFullYear();
  return (
    <div className="min-h-dvh">
      <Nav actual="admin" />
      <main className="mx-auto max-w-2xl p-3">
        <h1 className="mb-3 text-xl font-bold">Importar planilla</h1>
        <Importador activa={activa} sugerencia={{ nombre: `Peregrinación a Luján ${anio}`, fechaInicio: "" }} />
      </main>
    </div>
  );
}
