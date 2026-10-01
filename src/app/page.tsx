import { connection } from "next/server";
import { calcularResumen } from "@/domain/resumen";
import { cargarPeregrinacionActiva, cargarRegistros } from "@/lib/datos";

// Provisorio (fase 1): muestra el Resumen para verificar DB + dominio.
// En la fase 4 esto pasa al tablero.
export default async function Inicio() {
  await connection();
  const peregrinacion = await cargarPeregrinacionActiva();
  if (!peregrinacion) {
    return <main className="p-4">No hay ninguna peregrinación activa. Corré <code>npm run db:seed</code>.</main>;
  }
  const registros = await cargarRegistros(peregrinacion.id);
  const r = calcularResumen(peregrinacion.caminantes, peregrinacion.puestos, registros);
  const puestos = peregrinacion.puestos;

  return (
    <main className="mx-auto w-full max-w-md p-4">
      <h1 className="text-xl font-bold">{peregrinacion.nombre}</h1>
      <h2 className="mt-4 font-semibold">Resumen</h2>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <dt>Personas</dt>
        <dd className="text-right font-mono">{r.personas}</dd>
        {puestos
          .filter((p) => p.esPartidaPosible)
          .map((p) => (
            <div key={p.id} className="contents">
              <dt>Salen desde {p.nombre}</dt>
              <dd className="text-right font-mono">{r.salenDesde[p.id]}</dd>
            </div>
          ))}
        <dt className="pl-4">… a {puestos[0]?.nombre} en micro</dt>
        <dd className="text-right font-mono">{r.ida.micro}</dd>
        <dt className="pl-4">… a {puestos[0]?.nombre} por su cuenta</dt>
        <dd className="text-right font-mono">{r.ida.porSuCuenta}</dd>
        <dt>Vuelven en micro</dt>
        <dd className="text-right font-mono">{r.vuelta.micro}</dd>
        <dt>Vuelven por su cuenta</dt>
        <dd className="text-right font-mono">{r.vuelta.porSuCuenta}</dd>
      </dl>
      <h2 className="mt-4 font-semibold">Pasan por cada puesto</h2>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        {puestos
          .filter((p) => p.orden > 0)
          .map((p) => (
            <div key={p.id} className="contents">
              <dt>
                {p.orden}. {p.nombre}
              </dt>
              <dd className="text-right font-mono">{r.pasanPorPuesto[p.id]}</dd>
            </div>
          ))}
      </dl>
    </main>
  );
}
