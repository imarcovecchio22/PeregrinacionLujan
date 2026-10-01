"use client";

import { useState } from "react";
import { formatHora } from "@/domain/hora";

/** Corregir o borrar la hora de un registro (puestos y micros). */
export function EditorHora({
  registro,
  titulo,
  onGuardar,
  onBorrar,
  onCancelar,
}: {
  registro: { hora: string; cargadoPor: string | null };
  titulo: string;
  onGuardar: (hhmm: string) => void;
  onBorrar: () => void;
  onCancelar: () => void;
}) {
  const [hhmm, setHhmm] = useState(formatHora(new Date(registro.hora)));
  return (
    <div className="mt-2 rounded-md border border-gray-300 bg-gray-50 p-2">
      <label className="flex items-center gap-2 text-sm">
        Hora de &quot;{titulo}&quot;
        <input
          type="time"
          value={hhmm}
          onChange={(e) => setHhmm(e.target.value)}
          className="rounded border border-gray-400 bg-white px-2 py-1 text-lg"
        />
      </label>
      {registro.cargadoPor && <p className="mt-1 text-xs text-gray-500">Cargado por {registro.cargadoPor}</p>}
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => hhmm && onGuardar(hhmm)} className="flex-1 rounded-md bg-gray-800 py-2 font-semibold text-white">
          Guardar
        </button>
        <button type="button" onClick={onCancelar} className="flex-1 rounded-md border border-gray-300 bg-white py-2">
          Cancelar
        </button>
        <button type="button" onClick={onBorrar} className="rounded-md border border-red-300 bg-white px-3 py-2 text-red-700">
          Borrar
        </button>
      </div>
    </div>
  );
}
