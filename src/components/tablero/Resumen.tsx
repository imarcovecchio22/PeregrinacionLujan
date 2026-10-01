import type { Resumen as DatosResumen } from "@/domain/resumen";
import type { PuestoDom } from "@/domain/tipos";

/** Mismo contenido que la hoja "Resumen y control" de la planilla, más el estado en vivo. */
export function Resumen({ resumen: r, puestos }: { resumen: DatosResumen; puestos: PuestoDom[] }) {
  const primero = puestos[0];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <section className="rounded-lg border border-gray-200 bg-white p-3">
        <h2 className="font-semibold">Resumen</h2>
        <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-sm">
          <Fila t="Personas" v={r.personas} fuerte />
          {puestos
            .filter((p) => p.esPartidaPosible)
            .map((p) => (
              <div key={p.id} className="contents">
                <Fila t={`Salen desde ${p.nombre}`} v={r.salenDesde[p.id]} />
                {p.id === primero?.id && (
                  <>
                    <Fila t={`… a ${p.nombre} en micro`} v={r.ida.micro} sangria />
                    <Fila t={`… a ${p.nombre} por su cuenta`} v={r.ida.porSuCuenta} sangria />
                    {r.ida.sinDato > 0 && <Fila t="… sin dato de ida" v={r.ida.sinDato} sangria />}
                  </>
                )}
              </div>
            ))}
          <Fila t="Vuelven en micro" v={r.vuelta.micro} />
          <Fila t="Vuelven por su cuenta" v={r.vuelta.porSuCuenta} />
          {r.vuelta.sinDato > 0 && <Fila t="Sin dato de vuelta" v={r.vuelta.sinDato} />}
          <Fila t="Abandonos" v={r.abandonos} />
        </dl>
      </section>

      <section className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-3">
        <h2 className="font-semibold">Por puesto, en tiempo real</h2>
        <table className="mt-2 w-full text-sm">
          <thead className="text-left text-xs text-gray-500">
            <tr>
              <th className="py-1 font-medium">Puesto</th>
              <th className="py-1 text-right font-medium">Pasan</th>
              <th className="py-1 text-right font-medium">Ingresaron</th>
              <th className="py-1 text-right font-medium">Salieron</th>
              <th className="py-1 text-right font-medium">Aband.</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {r.estadoPorPuesto.map((e) => {
              const p = puestos.find((x) => x.id === e.puestoId)!;
              return (
                <tr key={e.puestoId} className="border-t border-gray-100">
                  <td className="py-1 font-sans">
                    {p.orden}. {p.nombre}
                  </td>
                  <td className="py-1 text-right">{r.pasanPorPuesto[p.id] || "—"}</td>
                  <td className="py-1 text-right">
                    <Progreso hechos={e.ingresaron} total={e.esperanIngreso} />
                  </td>
                  <td className="py-1 text-right">
                    <Progreso hechos={e.salieron} total={e.esperanSalida} />
                  </td>
                  <td className="py-1 text-right">{e.abandonos || ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-1 text-xs text-gray-500">
          &quot;Pasan&quot; es el plan (la partida no cuenta). Ingresaron/Salieron: hechos / esperados, sin contar abandonos.
        </p>
      </section>
    </div>
  );
}

function Fila({ t, v, fuerte, sangria }: { t: string; v: number; fuerte?: boolean; sangria?: boolean }) {
  return (
    <>
      <dt className={`${sangria ? "pl-4 text-gray-600" : ""} ${fuerte ? "font-semibold" : ""}`}>{t}</dt>
      <dd className={`text-right font-mono ${fuerte ? "font-semibold" : ""}`}>{v}</dd>
    </>
  );
}

function Progreso({ hechos, total }: { hechos: number; total: number }) {
  if (total === 0) return <span className="text-gray-400">—</span>;
  return (
    <span className={hechos === total ? "text-green-700" : ""}>
      {hechos}/{total}
    </span>
  );
}
