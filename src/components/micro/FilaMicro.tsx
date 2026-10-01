"use client";

import Link from "next/link";
import { memo, useState } from "react";
import { EditorHora } from "@/components/EditorHora";
import { formatHora } from "@/domain/hora";
import type { AbordajeApi, FilaMicro as Fila } from "@/lib/tipos-api";
import { hrefTelefono } from "@/lib/vista-puesto";
import type { EstadoCambioAbordaje } from "./useAbordajes";

interface Props {
  fila: Fila;
  estado?: EstadoCambioAbordaje;
  reciente: boolean;
  onSubio: (caminanteId: string, descripcion: string) => void;
  onEditarHora: (a: AbordajeApi, hhmm: string) => void;
  onBorrar: (a: AbordajeApi) => void;
  onReintentar: (caminanteId: string) => void;
  onDescartar: (caminanteId: string) => void;
}

function FilaMicroBase({ fila, estado, reciente, onSubio, onEditarHora, onBorrar, onReintentar, onDescartar }: Props) {
  const c = fila.caminante;
  const a = fila.abordaje;
  const [editando, setEditando] = useState(false);
  const enviando = estado?.estado === "enviando";
  const error = estado?.estado === "error" ? estado : null;
  const recien = reciente && !enviando;

  const fondo = error
    ? "bg-red-50 border-l-red-600"
    : enviando
      ? "bg-amber-100 border-l-amber-500"
      : recien
        ? "bg-green-100 border-l-green-600"
        : "bg-white border-l-transparent";

  return (
    <li className={`border-b border-l-8 border-b-gray-200 px-3 py-3 transition-colors duration-300 ${fondo}`}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-lg font-bold">#{c.numero}</span>
        <span className="text-lg leading-tight">{c.nombreCompleto}</span>
        <Link href={`/caminantes/${c.id}`} className="ml-auto py-1 pl-2 text-sm text-blue-700">
          Ficha ›
        </Link>
      </div>
      <p className="text-sm text-gray-600">
        {c.dni && `DNI ${c.dni} · `}Sale desde {fila.partida}
      </p>
      {!fila.esperado && (
        <p className="mt-1 inline-block rounded bg-amber-200 px-1.5 text-sm font-semibold text-amber-900">No anotado: {fila.motivo}</p>
      )}

      {(enviando || recien) && (
        <p
          role="status"
          className={`mt-1 ml-1 inline-block rounded-md px-2 py-0.5 text-base font-bold text-white ${enviando ? "animate-pulse bg-amber-500" : "bg-green-600"}`}
        >
          {enviando ? "⏳ Guardando…" : "✓ Guardado"}
        </p>
      )}

      {c.telefonos.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {c.telefonos.map((t) => {
            const href = hrefTelefono(t);
            return href ? (
              <a key={t} href={href} className="rounded-full border border-blue-300 bg-white px-3 py-1 text-sm text-blue-700 active:bg-blue-100">
                📞 {t}
              </a>
            ) : (
              <span key={t} className="text-sm text-gray-600">
                {t}
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-2">
        {a ? (
          <button
            type="button"
            onClick={() => setEditando(!editando)}
            className="min-h-14 w-full rounded-xl border-2 border-green-600 bg-white text-green-800"
          >
            <span className="font-mono text-lg font-bold">
              {enviando ? "⏳" : "✓"} Subió {formatHora(new Date(a.hora))}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSubio(c.id, `#${c.numero} ${c.nombreCompleto}: subió`)}
            className="min-h-14 w-full rounded-xl bg-green-600 text-lg font-bold text-white shadow-sm active:bg-green-800"
          >
            {fila.esperado ? "Subió" : "Subió igual (no estaba anotado)"}
          </button>
        )}
      </div>

      {editando && a && (
        <EditorHora
          registro={a}
          titulo="Subió"
          onGuardar={(hhmm) => {
            onEditarHora(a, hhmm);
            setEditando(false);
          }}
          onBorrar={() => {
            if (confirm(`¿Borrar que #${c.numero} subió?`)) {
              onBorrar(a);
              setEditando(false);
            }
          }}
          onCancelar={() => setEditando(false)}
        />
      )}

      {error && (
        <div className="mt-2 rounded-md border-2 border-red-400 bg-white p-2 text-red-800">
          <p>
            <b>⚠️ NO SE GUARDÓ</b> ({error.cambio.accion === "borrar" ? "borrar " : ""}subió): {error.error}
          </p>
          <div className="mt-2 flex gap-2">
            {error.reintentable && (
              <button type="button" onClick={() => onReintentar(c.id)} className="min-h-12 flex-1 rounded-md bg-red-600 font-semibold text-white">
                Reintentar
              </button>
            )}
            <button type="button" onClick={() => onDescartar(c.id)} className="min-h-12 flex-1 rounded-md border border-red-300">
              Descartar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export const FilaMicro = memo(FilaMicroBase);
