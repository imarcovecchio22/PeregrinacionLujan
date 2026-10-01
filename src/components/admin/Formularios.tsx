"use client";

import { startTransition, useActionState } from "react";
import { guardarPeregrinacion, guardarPuesto, type ResultadoAdmin } from "@/app/admin/acciones";

const campo = "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2";

/** Envía sin que React resetee los campos (así no se pierde lo escrito si hay error). */
function enviarSinReset(accion: (d: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => accion(datos));
  };
}

function Estado({ estado }: { estado: ResultadoAdmin }) {
  if (estado.error) return <p className="text-sm text-red-700">{estado.error}</p>;
  if (estado.ok) return <p className="text-sm text-green-800">{estado.ok}</p>;
  return null;
}

export function FormPeregrinacion({
  valores,
  boton,
}: {
  valores?: { id: string; nombre: string; fechaInicio: string };
  boton: string;
}) {
  const [estado, accion, enviando] = useActionState<ResultadoAdmin, FormData>(guardarPeregrinacion, {});
  return (
    <form onSubmit={enviarSinReset(accion)} className="grid gap-2">
      {valores && <input type="hidden" name="id" value={valores.id} />}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="text-sm font-medium">
          Nombre
          <input name="nombre" required defaultValue={valores?.nombre} className={campo} />
        </label>
        <label className="text-sm font-medium">
          Fecha de salida
          <input name="fechaInicio" type="date" required defaultValue={valores?.fechaInicio} className={campo} />
        </label>
      </div>
      <button disabled={enviando} className="min-h-11 rounded-xl bg-gray-900 font-semibold text-white disabled:opacity-60">
        {boton}
      </button>
      <Estado estado={estado} />
    </form>
  );
}

export function FormPuesto({
  puesto,
}: {
  puesto: { id: string; orden: number; nombre: string; esPartidaPosible: boolean; registraIngreso: boolean; registraSalida: boolean; horaCheckin: string | null };
}) {
  const [estado, accion, enviando] = useActionState<ResultadoAdmin, FormData>(guardarPuesto, {});
  const check = (name: keyof typeof puesto, texto: string) => (
    <label className="flex items-center gap-1 text-sm">
      <input type="checkbox" name={name} defaultChecked={Boolean(puesto[name])} />
      {texto}
    </label>
  );
  return (
    <form onSubmit={enviarSinReset(accion)} className="grid gap-1 border-t border-gray-100 py-2">
      <input type="hidden" name="id" value={puesto.id} />
      <div className="flex items-center gap-2">
        <span className="w-6 font-mono text-gray-500">{puesto.orden}.</span>
        <input name="nombre" required defaultValue={puesto.nombre} className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1" />
        <button disabled={enviando} className="rounded-md border border-gray-300 px-3 py-1 text-sm">
          Guardar
        </button>
      </div>
      <div className="flex flex-wrap gap-x-4 pl-8">
        {check("esPartidaPosible", "Punto de partida")}
        {check("registraIngreso", "Registra ingreso")}
        {check("registraSalida", "Registra salida")}
      </div>
      {puesto.esPartidaPosible && (
        <label className="flex items-center gap-2 pl-8 text-sm">
          Check-in en la parroquia a las
          <input
            type="time"
            name="horaCheckin"
            defaultValue={puesto.horaCheckin ?? ""}
            className="rounded border border-gray-300 px-2 py-1"
          />
        </label>
      )}
      <div className="pl-8">
        <Estado estado={estado} />
      </div>
    </form>
  );
}
