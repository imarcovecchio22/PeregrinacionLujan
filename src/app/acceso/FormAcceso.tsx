"use client";

import { useActionState } from "react";
import { ingresar } from "./acciones";

export function FormAcceso({ siguiente }: { siguiente: string }) {
  const [estado, accion, enviando] = useActionState(ingresar, {});
  return (
    <form action={accion} className="mt-4 grid gap-3">
      <input type="hidden" name="siguiente" value={siguiente} />
      <input
        name="codigo"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        placeholder="Código de acceso"
        className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-lg"
      />
      {estado.error && <p className="text-red-700">{estado.error}</p>}
      <button disabled={enviando} className="min-h-14 rounded-xl bg-gray-900 text-lg font-semibold text-white disabled:opacity-60">
        {enviando ? "Verificando…" : "Entrar"}
      </button>
    </form>
  );
}
