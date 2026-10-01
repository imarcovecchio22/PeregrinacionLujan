"use client";

import { useRef, useState, useTransition } from "react";
import { confirmarImportacion, previsualizarImportacion } from "@/app/admin/importar/acciones";
import type { TipoAviso } from "@/domain/importar";
import type { Previsualizacion } from "@/lib/importacion";

const TITULOS_AVISO: Record<TipoAviso, string> = {
  DUPLICADO: "Posibles duplicados",
  TELEFONO_COMPARTIDO: "Teléfonos compartidos entre personas distintas",
  VARIOS_TELEFONOS: "Varios teléfonos en una celda",
  NO_AMBA: "Teléfonos con formato no AMBA",
  PARTIDA: "Punto de partida",
  TRANSPORTE: "Transporte",
  HORA: "Horas",
};

interface Props {
  activa: { nombre: string } | null;
  sugerencia: { nombre: string; fechaInicio: string };
}

const campo = "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2";

export function Importador({ activa, sugerencia }: Props) {
  const form = useRef<HTMLFormElement>(null);
  const [destino, setDestino] = useState<"NUEVA" | "REEMPLAZAR">("NUEVA");
  const [previa, setPrevia] = useState<Previsualizacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmoBorrado, setConfirmoBorrado] = useState(false);
  const [pendiente, iniciar] = useTransition();

  // Cualquier cambio invalida la previsualización: hay que volver a revisarla antes de importar.
  const invalidar = () => {
    setPrevia(null);
    setError(null);
    setConfirmoBorrado(false);
  };

  function previsualizar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    iniciar(async () => {
      const r = await previsualizarImportacion(datos);
      if ("error" in r) setError(r.error);
      else {
        setPrevia(r.previa);
        setError(null);
      }
    });
  }

  function confirmar() {
    if (!form.current) return;
    const datos = new FormData(form.current);
    iniciar(async () => {
      const r = await confirmarImportacion(datos); // si sale bien, redirige al tablero
      if (r?.error) setError(r.error);
    });
  }

  const hayBorrado = !!previa?.aBorrar && previa.aBorrar.caminantes > 0;
  const avisosPorTipo = Map.groupBy(previa?.avisos ?? [], (a) => a.tipo);

  return (
    <div className="grid gap-3">
      <form ref={form} onSubmit={previsualizar} onChange={invalidar} className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <label className="text-sm font-medium">
          Planilla (.xlsx con la hoja &quot;Listado&quot;, o .csv)
          <input name="archivo" type="file" accept=".xlsx,.csv" required className={campo} />
        </label>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">¿Dónde se importa?</legend>
          <label className="flex items-start gap-2 rounded-lg border border-gray-200 p-2">
            <input type="radio" name="destino" value="NUEVA" checked={destino === "NUEVA"} onChange={() => setDestino("NUEVA")} className="mt-1" />
            <span>
              <b>En una peregrinación nueva</b>
              <span className="block text-sm text-gray-600">Usa los mismos puestos y pasa a ser la activa. La actual queda guardada.</span>
            </span>
          </label>
          {activa && (
            <label className="flex items-start gap-2 rounded-lg border border-gray-200 p-2">
              <input
                type="radio"
                name="destino"
                value="REEMPLAZAR"
                checked={destino === "REEMPLAZAR"}
                onChange={() => setDestino("REEMPLAZAR")}
                className="mt-1"
              />
              <span>
                <b>Reemplazar los caminantes de «{activa.nombre}»</b>
                <span className="block text-sm text-gray-600">Borra sus caminantes y registros actuales.</span>
              </span>
            </label>
          )}
        </fieldset>

        {destino === "NUEVA" && (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="text-sm font-medium">
              Nombre
              <input name="nombre" required defaultValue={sugerencia.nombre} className={campo} />
            </label>
            <label className="text-sm font-medium">
              Fecha de salida
              <input name="fechaInicio" type="date" required defaultValue={sugerencia.fechaInicio} className={campo} />
            </label>
          </div>
        )}

        <label className="text-sm font-medium">
          Si la planilla tiene horas: la primera hora de cada persona anterior a
          <input name="corte" type="time" defaultValue="12:00" required className="mx-2 rounded border border-gray-300 px-2 py-1" />
          se toma como del día siguiente.
          <span className="block text-xs font-normal text-gray-500">
            Las horas de la planilla no tienen fecha; después de la primera, cada hora que &quot;retrocede&quot; pasa al día siguiente.
          </span>
        </label>

        <button disabled={pendiente} className="min-h-12 rounded-xl bg-gray-900 font-semibold text-white disabled:opacity-60">
          {pendiente && !previa ? "Leyendo…" : "Previsualizar"}
        </button>
      </form>

      {error && <p className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}

      {previa && (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-3">
            <h2 className="font-semibold">Así quedaría</h2>
            <p className="text-sm text-gray-600">Destino: {previa.destinoTexto}</p>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-sm">
              <dt className="font-semibold">Personas</dt>
              <dd className="text-right font-mono font-semibold">{previa.personas}</dd>
              {previa.salenDesde.map((s) => (
                <div key={s.nombre} className="contents">
                  <dt>Salen desde {s.nombre}</dt>
                  <dd className="text-right font-mono">{s.cantidad}</dd>
                </div>
              ))}
              <dt className="pl-4 text-gray-600">… a {previa.ida.puesto} en micro / por su cuenta</dt>
              <dd className="text-right font-mono">
                {previa.ida.micro} / {previa.ida.porSuCuenta}
                {previa.ida.sinDato > 0 && ` (sin dato ${previa.ida.sinDato})`}
              </dd>
              <dt>Vuelven desde {previa.vuelta.puesto} en micro / por su cuenta</dt>
              <dd className="text-right font-mono">
                {previa.vuelta.micro} / {previa.vuelta.porSuCuenta}
                {previa.vuelta.sinDato > 0 && ` (sin dato ${previa.vuelta.sinDato})`}
              </dd>
              {previa.pasan.map((p) => (
                <div key={p.nombre} className="contents">
                  <dt className="text-gray-600">Pasan por {p.nombre}</dt>
                  <dd className="text-right font-mono">{p.cantidad}</dd>
                </div>
              ))}
              <dt>Horas cargadas en la planilla</dt>
              <dd className="text-right font-mono">{previa.horas}</dd>
            </dl>
          </section>

          {previa.errores.length > 0 && (
            <section className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
              <h2 className="font-semibold">
                {previa.errores.length} {previa.errores.length === 1 ? "problema" : "problemas"} (esas filas NO se importan)
              </h2>
              <ul className="mt-1 list-disc pl-5">
                {previa.errores.map((e, i) => (
                  <li key={i}>{e.mensaje}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <h2 className="font-semibold">Advertencias ({previa.avisos.length}) — no impiden importar</h2>
            {previa.avisos.length === 0 && <p className="mt-1">Ninguna.</p>}
            {[...avisosPorTipo].map(([tipo, lista]) => (
              <details key={tipo} className="mt-2" open={tipo === "DUPLICADO"}>
                <summary className="cursor-pointer font-medium">
                  {TITULOS_AVISO[tipo]} ({lista.length})
                </summary>
                <ul className="mt-1 list-disc pl-5">
                  {lista.map((a, i) => (
                    <li key={i}>{a.mensaje}</li>
                  ))}
                </ul>
              </details>
            ))}
          </section>

          <details className="rounded-lg border border-gray-200 bg-white p-3">
            <summary className="cursor-pointer font-semibold">Ver las {previa.filas.length} filas</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500">
                  <tr>
                    <th className="pr-2">N°</th>
                    <th className="pr-2">Apellido y nombre</th>
                    <th className="pr-2">Sale desde</th>
                    <th className="pr-2">Teléfono</th>
                    <th className="pr-2">Ida</th>
                    <th className="pr-2">Vuelta</th>
                    <th>Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {previa.filas.map((f) => (
                    <tr key={f.fila} className="border-t border-gray-100">
                      <td className="pr-2 font-mono">{f.numero}</td>
                      <td className="pr-2">{f.nombreCompleto}</td>
                      <td className="pr-2">{f.partida}</td>
                      <td className="pr-2 whitespace-nowrap">{f.telefonos.join(" / ")}</td>
                      <td className="pr-2">{f.ida}</td>
                      <td className="pr-2">{f.vuelta}</td>
                      <td className="font-mono">{f.horas || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          <section className="grid gap-2 rounded-lg border-2 border-gray-900 bg-white p-3">
            {hayBorrado && (
              <label className="flex items-start gap-2 rounded-md bg-red-50 p-2 text-sm text-red-900">
                <input type="checkbox" checked={confirmoBorrado} onChange={(e) => setConfirmoBorrado(e.target.checked)} className="mt-1" />
                Entiendo que se borran {previa.aBorrar!.caminantes} caminantes y {previa.aBorrar!.registros} registros actuales.
              </label>
            )}
            <button
              type="button"
              onClick={confirmar}
              disabled={pendiente || previa.filas.length === 0 || (hayBorrado && !confirmoBorrado)}
              className="min-h-12 rounded-xl bg-green-700 font-semibold text-white disabled:opacity-50"
            >
              {pendiente ? "Importando…" : `Importar ${previa.filas.length} caminantes`}
            </button>
          </section>
        </>
      )}
    </div>
  );
}
