import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonConfirmar } from "@/components/BotonConfirmar";
import { FormAbandono } from "@/components/caminante/FormAbandono";
import { FormCaminante } from "@/components/caminante/FormCaminante";
import { RecorridoEditable, RegistrosSobrantes } from "@/components/caminante/RecorridoEditable";
import { Nav } from "@/components/Nav";
import { formatFechaHora } from "@/domain/hora";
import { describirPosicion, inconsistencias, posicionActual, registrosPlanificados } from "@/domain/recorrido";
import { cargarFicha } from "@/lib/caminante";
import { hrefTelefono } from "@/lib/vista-puesto";
import { eliminarCaminante } from "../acciones";

export default async function FichaCaminante(props: PageProps<"/caminantes/[id]">) {
  const { id } = await props.params;
  const ficha = await cargarFicha(id);
  if (!ficha) notFound();
  const { caminante: c, puestos, registros, registrosDom } = ficha;

  const partida = puestos.find((p) => p.id === c.puntoPartidaId)!;
  const posicion = describirPosicion(posicionActual(c, puestos, registrosDom), puestos);
  const problemas = inconsistencias(c, puestos, registrosDom);
  const sobrantes = registros.filter((r) => {
    const p = puestos.find((x) => x.id === r.puestoId);
    return !p || !registrosPlanificados(c, p, puestos).includes(r.tipo);
  });
  const abandono = c.abandonoTrasPuestoId ? puestos.find((p) => p.id === c.abandonoTrasPuestoId) : null;
  const ultimo = puestos[puestos.length - 1];
  const tarjeta = "rounded-lg border border-gray-200 bg-white p-3";

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto grid max-w-lg gap-3 p-3">
        <header>
          <h1 className="text-xl font-bold">
            <span className="font-mono">#{c.numero}</span> {c.nombreCompleto}
          </h1>
          <p className="text-gray-700">
            Sale desde <b>{partida.nombre}</b> · {posicion}
          </p>
          {c.dni && <p className="text-sm text-gray-600">DNI {c.dni}</p>}
          {c.telefonos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {c.telefonos.map((t) => {
                const href = hrefTelefono(t);
                return href ? (
                  <a key={t} href={href} className="rounded-full border border-blue-300 bg-white px-3 py-1 text-blue-700">
                    📞 {t}
                  </a>
                ) : (
                  <span key={t}>{t}</span>
                );
              })}
            </div>
          )}
        </header>

        {problemas.length > 0 && (
          <section className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <h2 className="font-semibold">⚠️ Para revisar</h2>
            <ul className="mt-1 list-disc pl-5">
              {problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <RegistrosSobrantes registros={sobrantes} puestos={puestos} />
          </section>
        )}

        <section className={tarjeta}>
          <h2 className="font-semibold">Recorrido</h2>
          <RecorridoEditable caminante={c} puestos={puestos} registros={registros} />
        </section>

        <section className={tarjeta}>
          <h2 className="font-semibold">Historial</h2>
          {registros.length === 0 ? (
            <p className="mt-1 text-sm text-gray-500">Sin registros todavía.</p>
          ) : (
            <ol className="mt-1 grid gap-0.5 text-sm">
              {registros.map((r) => (
                <li key={r.id}>
                  <span className="font-mono">{formatFechaHora(new Date(r.hora))}</span> —{" "}
                  {r.tipo === "INGRESO" ? "Ingreso" : "Salida"} en {puestos.find((p) => p.id === r.puestoId)?.nombre}
                  {r.cargadoPor && <span className="text-gray-500"> ({r.cargadoPor})</span>}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={tarjeta}>
          <h2 className="mb-2 font-semibold">Abandono</h2>
          <FormAbandono
            caminanteId={c.id}
            opciones={puestos.filter((p) => p.orden >= partida.orden && p.id !== ultimo.id)}
            actual={
              abandono ? { puestoId: abandono.id, nombre: abandono.nombre, hora: c.abandonoHora?.toISOString() ?? null } : null
            }
          />
        </section>

        <details className={tarjeta}>
          <summary className="cursor-pointer font-semibold">Editar datos</summary>
          <div className="mt-3">
            <FormCaminante
              valores={c}
              partidas={puestos.filter((p) => p.esPartidaPosible)}
              primerPuestoId={puestos[0].id}
            />
          </div>
          <form action={eliminarCaminante} className="mt-6 border-t border-gray-200 pt-3">
            <input type="hidden" name="id" value={c.id} />
            <BotonConfirmar
              mensaje={`¿Eliminar al caminante #${c.numero} y todos sus registros? No se puede deshacer.`}
              className="w-full rounded-xl border-2 border-red-300 py-2 font-semibold text-red-700"
            >
              Eliminar caminante #{c.numero} y sus registros
            </BotonConfirmar>
          </form>
        </details>

        <Link href="/tablero" className="text-center text-blue-700">
          ← Volver al tablero
        </Link>
      </main>
    </div>
  );
}
