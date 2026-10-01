"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { guardarDispositivo, useDispositivo } from "@/lib/dispositivo";

interface Props {
  titulo: string;
  puestos: { id: string; orden: number; nombre: string }[];
  /** true = el usuario vino a cambiar de puesto: no redirigir automáticamente. */
  cambiar: boolean;
}

export function SelectorPuesto({ titulo, puestos, cambiar }: Props) {
  const router = useRouter();
  const dispositivo = useDispositivo();

  // Si este celular ya eligió puesto (o micro), ir directo ahí.
  const destino = destinoGuardado(dispositivo?.puestoId ?? null, puestos);
  useEffect(() => {
    if (!cambiar && destino) router.replace(destino);
  }, [cambiar, destino, router]);

  if (!dispositivo || (!cambiar && destino)) return null;

  return <Formulario key={dispositivo.nombre} titulo={titulo} puestos={puestos} nombreInicial={dispositivo.nombre} />;
}

function Formulario({ titulo, puestos, nombreInicial }: Omit<Props, "cambiar"> & { nombreInicial: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreInicial);
  const [falta, setFalta] = useState(false);

  function elegir(puestoId: string, destino: string) {
    if (!nombre.trim()) {
      setFalta(true);
      return;
    }
    guardarDispositivo({ puestoId, nombre: nombre.trim() });
    router.push(destino);
  }

  return (
    <main className="mx-auto w-full max-w-md p-4">
      <h1 className="text-xl font-bold">{titulo}</h1>
      <label className="mt-6 block font-semibold" htmlFor="nombre">
        ¿Quién carga en este celular?
      </label>
      <input
        id="nombre"
        value={nombre}
        onChange={(e) => {
          setNombre(e.target.value);
          setFalta(false);
        }}
        placeholder="Tu nombre"
        className={`mt-1 w-full rounded-lg border px-3 py-3 text-lg ${falta ? "border-red-500" : "border-gray-300"}`}
      />
      {falta && <p className="mt-1 text-sm text-red-600">Escribí tu nombre antes de elegir el puesto.</p>}

      <h2 className="mt-6 font-semibold">¿En qué puesto estás?</h2>
      <div className="mt-2 grid gap-2">
        {puestos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => elegir(p.id, `/puesto/${p.id}`)}
            className="min-h-14 rounded-xl border-2 border-gray-300 bg-white px-4 text-left text-lg font-semibold active:bg-gray-100"
          >
            {p.orden}. {p.nombre}
          </button>
        ))}
      </div>

      <h2 className="mt-6 font-semibold">¿Hacés el check-in en la parroquia?</h2>
      <button
        type="button"
        onClick={() => elegir("micro:checkin", "/checkin")}
        className="mt-2 min-h-14 w-full rounded-xl border-2 border-blue-700 bg-white px-3 text-lg font-semibold text-blue-800 active:bg-blue-50"
      >
        📋 Check-in
      </button>

      <h2 className="mt-6 font-semibold">¿O controlás un micro?</h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["ida", "vuelta"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => elegir(`micro:${t}`, `/micro/${t}`)}
            className="min-h-14 rounded-xl border-2 border-green-700 bg-white px-3 text-lg font-semibold text-green-800 active:bg-green-50"
          >
            🚌 {t === "ida" ? "Ida" : "Vuelta"}
          </button>
        ))}
      </div>

      <Link href="/tablero" className="mt-8 block text-center text-blue-700">
        Ver resumen general →
      </Link>
    </main>
  );
}

/** Adónde mandar a un celular que ya eligió: un puesto ("<id>"), un micro ("micro:ida") o el check-in. */
function destinoGuardado(guardado: string | null, puestos: { id: string }[]): string | null {
  if (!guardado) return null;
  if (guardado === "micro:checkin") return "/checkin";
  if (guardado === "micro:ida" || guardado === "micro:vuelta") return `/micro/${guardado.slice(6)}`;
  return puestos.some((p) => p.id === guardado) ? `/puesto/${guardado}` : null;
}
