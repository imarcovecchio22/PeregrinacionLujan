"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatHora } from "@/domain/hora";
import type { PuestoDom, TipoRegistro } from "@/domain/tipos";
import type { CeldaTablero, DatosTablero, FilaTablero } from "@/lib/tablero";
import { coincideCaminante } from "@/lib/vista-puesto";
import { Resumen } from "./Resumen";

const REFRESCO_MS = 20_000;

export function Tablero({ datos }: { datos: DatosTablero }) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [posicion, setPosicion] = useState<string | null>(null);
  const [soloInconsistencias, setSoloInconsistencias] = useState(false);

  // Refresco automático (vuelve a renderizar en el servidor con datos nuevos).
  useEffect(() => {
    const visible = () => document.visibilityState === "visible";
    const id = setInterval(() => visible() && router.refresh(), REFRESCO_MS);
    const alVolver = () => visible() && router.refresh();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [router]);

  const conInconsistencias = datos.filas.filter((f) => f.inconsistencias.length > 0).length;
  const filas = useMemo(() => {
    return datos.filas.filter(
      (f) =>
        (!posicion || f.clavePosicion === posicion) &&
        (!soloInconsistencias || f.inconsistencias.length > 0) &&
        coincideCaminante(f, busqueda),
    );
  }, [datos.filas, busqueda, posicion, soloInconsistencias]);

  return (
    <main className="mx-auto max-w-6xl p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-lg font-bold">{datos.nombre}</h1>
        <span className="text-right text-xs text-gray-500">
          Actualizado {formatHora(new Date(datos.generado))} ·{" "}
          <a href="/api/exportar" className="text-blue-700">
            Descargar planilla
          </a>
        </span>
      </div>

      <div className="mt-2">
        <Resumen resumen={datos.resumen} puestos={datos.puestos} />
      </div>

      <Link href="/checkin" className="mt-3 block rounded-lg border border-gray-200 bg-white p-3">
        <div className="text-sm font-semibold">📋 Check-in en la parroquia</div>
        <div className="font-mono text-xl font-bold">
          {datos.checkin.subieron}
          <span className="text-sm font-normal"> / {datos.checkin.esperados} llegaron</span>
        </div>
        <div className="text-xs text-gray-600">Faltan {datos.checkin.faltan}</div>
      </Link>

      <section className="mt-3 grid grid-cols-2 gap-2">
        {(["IDA", "VUELTA"] as const).map((t) => {
          const m = datos.micros[t];
          return (
            <Link key={t} href={`/micro/${t.toLowerCase()}`} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="text-sm font-semibold">🚌 Micro de {t === "IDA" ? "ida" : "vuelta"}</div>
              <div className="font-mono text-xl font-bold">
                {m.subieron}
                <span className="text-sm font-normal"> / {m.esperados} subieron</span>
              </div>
              <div className="text-xs text-gray-600">
                Faltan {m.faltan}
                {m.extras > 0 && ` · ${m.extras} no anotados`}
              </div>
            </Link>
          );
        })}
      </section>

      <section className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
        <h2 className="font-semibold">¿Dónde están?</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {datos.posiciones.map((g) => (
            <button
              key={g.clave}
              type="button"
              onClick={() => setPosicion(posicion === g.clave ? null : g.clave)}
              className={`rounded-full border px-3 py-1 text-sm ${
                posicion === g.clave ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white"
              }`}
            >
              {g.texto} <b className="font-mono">{g.cantidad}</b>
            </button>
          ))}
        </div>
      </section>

      <div className="sticky top-0 z-20 mt-3 flex flex-wrap items-center gap-2 bg-gray-100 py-2">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar nombre, número o DNI"
          className="min-w-0 flex-1 basis-full rounded-lg border border-gray-300 bg-white px-3 py-2 sm:basis-auto"
        />
        {conInconsistencias > 0 && (
          <label className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-2 text-sm">
            <input type="checkbox" checked={soloInconsistencias} onChange={(e) => setSoloInconsistencias(e.target.checked)} />
            ⚠️ Inconsistencias ({conInconsistencias})
          </label>
        )}
        <span className="text-sm text-gray-600">
          {filas.length} de {datos.filas.length}
        </span>
      </div>

      <Matriz filas={filas} puestos={datos.puestos} />
    </main>
  );
}

function Matriz({ filas, puestos }: { filas: FilaTablero[]; puestos: PuestoDom[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-gray-50 text-xs text-gray-600">
          <tr>
            <th className="sticky left-0 z-10 bg-gray-50 px-2 py-2 text-left font-medium">Caminante</th>
            <th className="px-2 py-2 text-left font-medium">Posición</th>
            {puestos.map((p) => (
              <th key={p.id} className="px-2 py-2 text-center font-medium whitespace-nowrap">
                {p.orden}. {p.nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id} className="border-t border-gray-100">
              <td className="sticky left-0 z-10 max-w-40 bg-white px-2 py-1.5">
                <Link href={`/caminantes/${f.id}`} className="block text-blue-800">
                  <span className="font-mono font-bold">#{f.numero}</span> <span className="break-words">{f.nombreCompleto}</span>
                </Link>
                {f.inconsistencias.length > 0 && (
                  <span className="block text-xs text-amber-700" title={f.inconsistencias.join("\n")}>
                    ⚠️ {f.inconsistencias[0]}
                    {f.inconsistencias.length > 1 && ` (+${f.inconsistencias.length - 1})`}
                  </span>
                )}
              </td>
              <td className="px-2 py-1.5 text-xs whitespace-nowrap text-gray-700">{f.textoPosicion}</td>
              {puestos.map((p) => (
                <Celda key={p.id} celda={f.celdas[p.id]} esPartida={f.puntoPartidaId === p.id} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {filas.length === 0 && <p className="p-6 text-center text-gray-500">Nadie coincide con el filtro.</p>}
    </div>
  );
}

function Celda({ celda, esPartida }: { celda: CeldaTablero; esPartida: boolean }) {
  const tipos = (["INGRESO", "SALIDA"] as const).filter((t) => celda.planificados.includes(t) || celda.horas[t]);
  if (tipos.length === 0) return <td className="bg-gray-50 px-2 text-center text-gray-300">NA</td>;
  return (
    <td className={`px-2 py-1 text-center font-mono text-xs whitespace-nowrap ${esPartida ? "bg-amber-50" : ""}`}>
      {tipos.map((t) => (
        <div key={t}>
          <Valor celda={celda} tipo={t} />
        </div>
      ))}
    </td>
  );
}

function Valor({ celda, tipo }: { celda: CeldaTablero; tipo: TipoRegistro }) {
  const letra = tipo === "INGRESO" ? "I" : "S";
  const hora = celda.horas[tipo];
  if (hora && !celda.planificados.includes(tipo)) {
    return <span className="text-red-600" title="No le corresponde">{letra} {formatHora(new Date(hora))} ⚠️</span>;
  }
  if (hora) return <span className="text-gray-900"><span className="text-gray-400">{letra}</span> {formatHora(new Date(hora))}</span>;
  if (!celda.vigentes.includes(tipo)) return <span className="text-gray-300">{letra} ✕</span>;
  return <span className="text-gray-400">{letra} ·····</span>;
}
