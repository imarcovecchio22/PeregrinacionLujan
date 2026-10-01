"use client";

import { useState } from "react";
import { guardarDispositivo } from "@/lib/dispositivo";

/** Sin login: el celular declara quién carga (va a cargadoPor). */
export function PedirNombre() {
  const [valor, setValor] = useState("");
  return (
    <form
      className="m-3 rounded-lg border border-amber-300 bg-amber-50 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valor.trim()) guardarDispositivo({ nombre: valor.trim() });
      }}
    >
      <label className="block text-sm font-semibold">¿Quién está cargando en este celular?</label>
      <div className="mt-2 flex gap-2">
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Tu nombre"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2"
        />
        <button className="rounded-md bg-gray-900 px-4 font-semibold text-white">Listo</button>
      </div>
    </form>
  );
}
