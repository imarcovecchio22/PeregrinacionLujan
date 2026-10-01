"use client";

import { useActionState } from "react";
import { ingresar } from "./acciones";

export function FormAcceso({ siguiente }: { siguiente: string }) {
  const [estado, accion, enviando] = useActionState(ingresar, {});
  return (
    <form action={accion} className="grid gap-3">
      <input type="hidden" name="siguiente" value={siguiente} />
      <label htmlFor="codigo" className="text-sm font-semibold text-gray-700">
        Código de acceso
      </label>
      <input
        id="codigo"
        name="codigo"
        type="password"
        autoComplete="current-password"
        required
        placeholder="Ingresá el código"
        className="rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-lg outline-none focus:border-[#0E5A32] focus:bg-white"
      />
      {estado.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{estado.error}</p>}
      <button
        disabled={enviando}
        className="min-h-14 rounded-xl bg-[#0E5A32] text-lg font-bold tracking-wide text-white shadow-md active:bg-[#06331C] disabled:opacity-60"
      >
        {enviando ? "Verificando…" : "Entrar"}
      </button>
    </form>
  );
}
