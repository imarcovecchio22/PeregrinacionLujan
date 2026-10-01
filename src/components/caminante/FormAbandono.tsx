"use client";

import { useActionState } from "react";
import { marcarAbandono, type ResultadoForm } from "@/app/caminantes/acciones";
import { formatFechaHora } from "@/domain/hora";

interface Props {
  caminanteId: string;
  /** Puestos desde su partida hasta el anteúltimo (después de la llegada no hay abandono). */
  opciones: { id: string; nombre: string }[];
  actual: { puestoId: string; nombre: string; hora: string | null } | null;
}

export function FormAbandono({ caminanteId, opciones, actual }: Props) {
  const [estado, accion, enviando] = useActionState<ResultadoForm, FormData>(marcarAbandono, {});
  return (
    <form action={accion} className="grid gap-2">
      <input type="hidden" name="caminanteId" value={caminanteId} />
      {actual ? (
        <>
          <p>
            Abandonó después de <b>{actual.nombre}</b>
            {actual.hora && <span className="text-sm text-gray-600"> · marcado {formatFechaHora(new Date(actual.hora))}</span>}
          </p>
          <input type="hidden" name="puestoId" value="" />
          <button disabled={enviando} className="min-h-11 rounded-xl border-2 border-gray-300 font-semibold">
            Quitar abandono (sigue caminando)
          </button>
        </>
      ) : (
        <>
          <label className="text-sm font-medium">
            Abandonó después de…
            <select name="puestoId" required defaultValue="" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2">
              <option value="" disabled>
                Elegí el último puesto por el que pasó
              </option>
              {opciones.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <button disabled={enviando} className="min-h-11 rounded-xl bg-red-700 font-semibold text-white disabled:opacity-60">
            Marcar abandono
          </button>
        </>
      )}
      {estado.error && <p className="text-sm text-red-700">{estado.error}</p>}
      {estado.ok && <p className="text-sm text-green-800">{estado.ok}</p>}
    </form>
  );
}
