import Link from "next/link";
import { connection } from "next/server";
import { FormPeregrinacion, FormPuesto } from "@/components/admin/Formularios";
import { BotonConfirmar } from "@/components/BotonConfirmar";
import { Nav } from "@/components/Nav";
import { exigirAdminPagina } from "@/lib/acceso";
import { prisma } from "@/lib/db";
import { salir, salirAdmin } from "../acceso/acciones";
import { activarPeregrinacion, eliminarPeregrinacion } from "./acciones";

const tarjeta = "rounded-lg border border-gray-200 bg-white p-3";
const fecha = (d: Date) => d.toISOString().slice(0, 10);

export default async function Admin() {
  await connection();
  await exigirAdminPagina("/admin");
  const peregrinaciones = await prisma.peregrinacion.findMany({
    orderBy: { fechaInicio: "desc" },
    include: { puestos: { orderBy: { orden: "asc" } }, _count: { select: { caminantes: true } } },
  });
  const activa = peregrinaciones.find((p) => p.activa);
  const otras = peregrinaciones.filter((p) => !p.activa);

  return (
    <div className="min-h-dvh">
      <Nav actual="admin" />
      <main className="mx-auto grid max-w-lg gap-3 p-3">
        <h1 className="text-xl font-bold">Administración</h1>

        <section className={`${tarjeta} grid gap-2`}>
          <h2 className="font-semibold">Planilla</h2>
          <Link href="/admin/importar" className="rounded-xl bg-gray-900 py-3 text-center font-semibold text-white">
            Importar planilla (.xlsx / .csv)
          </Link>
          {activa && (
            <a href="/api/exportar" className="rounded-xl border-2 border-gray-900 py-3 text-center font-semibold">
              Descargar planilla de «{activa.nombre}»
            </a>
          )}
        </section>

        {activa ? (
          <>
            <section className={tarjeta}>
              <h2 className="mb-2 font-semibold">
                Peregrinación activa <span className="font-normal text-gray-600">({activa._count.caminantes} caminantes)</span>
              </h2>
              <FormPeregrinacion
                valores={{ id: activa.id, nombre: activa.nombre, fechaInicio: fecha(activa.fechaInicio) }}
                boton="Guardar"
              />
            </section>
            <section className={tarjeta}>
              <h2 className="font-semibold">Puestos</h2>
              <p className="text-xs text-gray-500">
                Las reglas de paso salen de estas opciones. El primer puesto no tiene columnas de hora en la planilla (se
                representa con &quot;Ida a&quot;).
              </p>
              <div className="mt-2">
                {activa.puestos.map((p) => (
                  <FormPuesto key={p.id} puesto={p} />
                ))}
              </div>
            </section>
          </>
        ) : (
          <p className={tarjeta}>No hay peregrinación activa. Importá una planilla o creá una nueva.</p>
        )}

        <section className={tarjeta}>
          <h2 className="mb-2 font-semibold">Nueva peregrinación vacía</h2>
          <p className="mb-2 text-xs text-gray-500">
            Copia los puestos de la activa y pasa a ser la activa. Para cargar caminantes desde la planilla, usá
            &quot;Importar&quot;.
          </p>
          <FormPeregrinacion boton="Crear" />
        </section>

        {otras.length > 0 && (
          <section className={tarjeta}>
            <h2 className="font-semibold">Otras peregrinaciones</h2>
            <ul className="mt-2 grid gap-2">
              {otras.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2">
                  <span className="flex-1">
                    {p.nombre} <span className="text-sm text-gray-500">({fecha(p.fechaInicio)}, {p._count.caminantes} caminantes)</span>
                  </span>
                  <a href={`/api/exportar?id=${p.id}`} className="rounded-md border border-gray-300 px-2 py-1 text-sm">
                    Descargar
                  </a>
                  <form action={activarPeregrinacion}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="rounded-md border border-gray-300 px-2 py-1 text-sm">Activar</button>
                  </form>
                  <form action={eliminarPeregrinacion}>
                    <input type="hidden" name="id" value={p.id} />
                    <BotonConfirmar
                      mensaje={`¿Eliminar «${p.nombre}» con sus ${p._count.caminantes} caminantes y registros? No se puede deshacer.`}
                      className="rounded-md border border-red-300 px-2 py-1 text-sm text-red-700"
                    >
                      Eliminar
                    </BotonConfirmar>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}
        <form action={salirAdmin} className="text-center">
          <button className="py-2 text-sm text-gray-600 underline">Dejar de ser admin en este celular</button>
        </form>
        <form action={salir} className="text-center">
          <button className="py-2 text-sm text-gray-600 underline">Salir en este celular (pide el código otra vez)</button>
        </form>
        <p className="text-center text-xs text-gray-400">Versión {process.env.NEXT_PUBLIC_VERSION}</p>
      </main>
    </div>
  );
}
