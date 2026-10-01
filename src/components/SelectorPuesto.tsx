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

  // Si este celular ya eligió puesto, ir directo ahí.
  const puestoGuardado = puestos.find((p) => p.id === dispositivo?.puestoId);
  useEffect(() => {
    if (!cambiar && puestoGuardado) router.replace(`/puesto/${puestoGuardado.id}`);
  }, [cambiar, puestoGuardado, router]);

  if (!dispositivo || (!cambiar && puestoGuardado)) return null;

  return <Formulario key={dispositivo.nombre} titulo={titulo} puestos={puestos} nombreInicial={dispositivo.nombre} />;
}

function Formulario({ titulo, puestos, nombreInicial }: Omit<Props, "cambiar"> & { nombreInicial: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreInicial);
  const [falta, setFalta] = useState(false);

  function elegir(puestoId: string) {
    if (!nombre.trim()) {
      setFalta(true);
      return;
    }
    guardarDispositivo({ puestoId, nombre: nombre.trim() });
    router.push(`/puesto/${puestoId}`);
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
            onClick={() => elegir(p.id)}
            className="min-h-14 rounded-xl border-2 border-gray-300 bg-white px-4 text-left text-lg font-semibold active:bg-gray-100"
          >
            {p.orden}. {p.nombre}
          </button>
        ))}
      </div>

      <Link href="/tablero" className="mt-8 block text-center text-blue-700">
        Ver resumen general →
      </Link>
    </main>
  );
}
