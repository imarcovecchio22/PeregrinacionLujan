"use client";

import { startTransition, useActionState, useState } from "react";
import { guardarCaminante, type ResultadoForm } from "@/app/caminantes/acciones";

export interface ValoresCaminante {
  id?: string;
  numero: number;
  nombreCompleto: string;
  telefonos: string[];
  dni: string | null;
  puntoPartidaId: string;
  transporteIda: string | null;
  transporteVuelta: string | null;
  notas: string | null;
}

interface Props {
  valores: ValoresCaminante;
  partidas: { id: string; nombre: string }[];
  /** Puesto cuyo punto de partida implica "Ida a Liniers". */
  primerPuestoId: string;
}

const campo = "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base";

export function FormCaminante({ valores: v, partidas, primerPuestoId }: Props) {
  const [estado, accion, enviando] = useActionState<ResultadoForm, FormData>(guardarCaminante, {});
  const [partida, setPartida] = useState(v.puntoPartidaId);

  return (
    <form
      // Con `action`, React resetea los campos después de enviar aunque haya error
      // (y se perdería lo escrito). Con onSubmit + startTransition se conservan.
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => accion(datos));
      }}
      className="grid gap-3"
    >
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <div className="grid grid-cols-[6rem_1fr] gap-2">
        <label className="text-sm font-medium">
          N°
          <input name="numero" type="number" inputMode="numeric" required defaultValue={v.numero} className={campo} />
        </label>
        <label className="text-sm font-medium">
          Apellido y nombre
          <input name="nombreCompleto" required defaultValue={v.nombreCompleto} className={campo} />
        </label>
      </div>
      <p className="-mt-2 text-xs text-gray-500">Se guarda tal cual se escribe (no se reordena nombre/apellido).</p>

      <label className="text-sm font-medium">
        Teléfonos <span className="font-normal text-gray-500">(uno por línea)</span>
        <textarea name="telefonos" rows={2} defaultValue={v.telefonos.join("\n")} className={campo} />
      </label>

      <label className="text-sm font-medium">
        DNI <span className="font-normal text-gray-500">(opcional)</span>
        <input name="dni" inputMode="numeric" defaultValue={v.dni ?? ""} className={campo} />
      </label>

      <label className="text-sm font-medium">
        Sale desde
        <select name="puntoPartidaId" value={partida} onChange={(e) => setPartida(e.target.value)} className={campo}>
          {partidas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>

      {partida === primerPuestoId && (
        <label className="text-sm font-medium">
          Ida a {partidas.find((p) => p.id === primerPuestoId)?.nombre}
          <SelectTransporte name="transporteIda" valor={v.transporteIda} />
        </label>
      )}
      <label className="text-sm font-medium">
        Vuelta desde Luján
        <SelectTransporte name="transporteVuelta" valor={v.transporteVuelta} />
      </label>

      <label className="text-sm font-medium">
        Notas
        <textarea name="notas" rows={2} defaultValue={v.notas ?? ""} className={campo} />
      </label>

      {estado.error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{estado.error}</p>}
      {estado.ok && <p className="rounded-md bg-green-50 p-2 text-sm text-green-800">{estado.ok}</p>}
      <button disabled={enviando} className="min-h-12 rounded-xl bg-gray-900 font-semibold text-white disabled:opacity-60">
        {enviando ? "Guardando…" : v.id ? "Guardar cambios" : "Crear caminante"}
      </button>
    </form>
  );
}

function SelectTransporte({ name, valor }: { name: string; valor: string | null }) {
  return (
    <select name={name} defaultValue={valor ?? ""} className={campo}>
      <option value="">Sin dato</option>
      <option value="MICRO">Micro</option>
      <option value="POR_SU_CUENTA">Por su cuenta</option>
    </select>
  );
}
