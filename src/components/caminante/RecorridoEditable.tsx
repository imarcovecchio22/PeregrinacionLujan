"use client";

// Recorrido del caminante puesto por puesto, con carga/corrección de cualquier registro
// (para correcciones del tablero). Usa la misma API idempotente que "Mi puesto".

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatFechaHora, formatHora, horaEditada } from "@/domain/hora";
import { pasosPlanificados, registrosPlanificados, registrosVigentes, rolEnPuesto } from "@/domain/recorrido";
import type { CaminanteDom, PuestoDom, TipoRegistro } from "@/domain/tipos";
import * as api from "@/lib/api-cliente";
import { useDispositivo } from "@/lib/dispositivo";
import type { RegistroApi } from "@/lib/tipos-api";

interface Props {
  caminante: CaminanteDom;
  puestos: PuestoDom[];
  registros: RegistroApi[];
}

const nombreTipo = (t: TipoRegistro) => (t === "INGRESO" ? "Ingreso" : "Salida");

export function RecorridoEditable({ caminante, puestos, registros }: Props) {
  // Para cargar una hora faltante se toma el día del registro vecino en el recorrido
  // (el anterior, o si no hay, el siguiente); recién si no hay ninguno, "ahora".
  const pasos = pasosPlanificados(caminante, puestos).map(
    (s) => registros.find((r) => r.puestoId === s.puesto.id && r.tipo === s.tipo)?.hora ?? null,
  );
  const referencia = (puestoId: string, tipo: TipoRegistro) => {
    const i = pasosPlanificados(caminante, puestos).findIndex((s) => s.puesto.id === puestoId && s.tipo === tipo);
    return pasos.slice(0, i).findLast((h) => h !== null) ?? pasos.slice(i + 1).find((h) => h !== null) ?? null;
  };
  return (
    <ol className="divide-y divide-gray-100">
      {puestos.map((p) => {
        const rol = rolEnPuesto(caminante, p, puestos);
        const planificados = registrosPlanificados(caminante, p, puestos);
        const vigentes = registrosVigentes(caminante, p, puestos);
        return (
          <li key={p.id} className={`py-2 ${rol === "NO_CORRESPONDE" ? "text-gray-400" : ""}`}>
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {p.orden}. {p.nombre}
              </span>
              {rol === "PARTIDA" && <span className="rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">Partida</span>}
              {rol === "NO_CORRESPONDE" && <span className="text-xs">NA (sale más adelante)</span>}
              {caminante.abandonoTrasPuestoId === p.id && (
                <span className="rounded bg-gray-200 px-1.5 text-xs font-semibold text-gray-700">Abandonó acá</span>
              )}
            </div>
            {planificados.map((tipo) => (
              <Paso
                key={tipo}
                caminanteId={caminante.id}
                puestoId={p.id}
                tipo={tipo}
                etiqueta={nombreTipo(tipo)}
                registro={registros.find((r) => r.puestoId === p.id && r.tipo === tipo)}
                esperado={vigentes.includes(tipo)}
                referencia={referencia(p.id, tipo)}
              />
            ))}
          </li>
        );
      })}
    </ol>
  );
}

function Paso(props: {
  caminanteId: string;
  puestoId: string;
  tipo: TipoRegistro;
  etiqueta: string;
  registro?: RegistroApi;
  esperado: boolean;
  /** ISO de un registro vecino, para deducir el día de una hora nueva. */
  referencia: string | null;
}) {
  const { registro, etiqueta, esperado } = props;
  const router = useRouter();
  const nombre = useDispositivo()?.nombre ?? "";
  const [editando, setEditando] = useState(false);
  const [hhmm, setHhmm] = useState("");
  const [estado, setEstado] = useState<{ enviando?: boolean; error?: string }>({});

  async function ejecutar(fn: () => Promise<unknown>) {
    setEstado({ enviando: true });
    try {
      await fn();
      setEstado({});
      setEditando(false);
      router.refresh();
    } catch (e) {
      setEstado({ error: e instanceof Error ? e.message : "Error" });
    }
  }

  function guardar() {
    if (!hhmm) return;
    const base = new Date(registro?.hora ?? props.referencia ?? Date.now());
    const hora = horaEditada(base, hhmm).toISOString();
    ejecutar(() =>
      api.guardarRegistro({
        id: registro?.id ?? api.nuevoId(),
        caminanteId: props.caminanteId,
        puestoId: props.puestoId,
        tipo: props.tipo,
        hora,
        cargadoPor: nombre || null,
      }),
    );
  }

  return (
    <div className="mt-1 pl-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="w-32 text-gray-600">{etiqueta}</span>
        {registro ? (
          <span className="font-mono font-semibold" title={formatFechaHora(new Date(registro.hora))}>
            {formatHora(new Date(registro.hora))}
          </span>
        ) : esperado ? (
          <span className="text-gray-400">pendiente</span>
        ) : (
          <span className="text-gray-400">no se espera (abandonó)</span>
        )}
        {registro?.cargadoPor && <span className="truncate text-xs text-gray-500">{registro.cargadoPor}</span>}
        <button
          type="button"
          onClick={() => {
            setHhmm(formatHora(registro ? new Date(registro.hora) : new Date()));
            setEditando(!editando);
          }}
          className="ml-auto rounded-md border border-gray-300 px-2 py-1 text-xs"
        >
          {registro ? "Editar" : "Cargar"}
        </button>
      </div>
      {editando && (
        <div className="mt-1 flex flex-wrap items-center gap-2 rounded-md bg-gray-50 p-2">
          <input
            type="time"
            value={hhmm}
            onChange={(e) => setHhmm(e.target.value)}
            className="rounded border border-gray-400 bg-white px-2 py-1"
          />
          <button type="button" disabled={estado.enviando} onClick={guardar} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white">
            Guardar
          </button>
          {registro && (
            <button
              type="button"
              disabled={estado.enviando}
              onClick={() => confirm(`¿Borrar ${etiqueta}?`) && ejecutar(() => api.borrarRegistro(registro.id))}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700"
            >
              Borrar
            </button>
          )}
          <button type="button" onClick={() => setEditando(false)} className="text-sm text-gray-600">
            Cancelar
          </button>
        </div>
      )}
      {estado.error && <p className="mt-1 text-sm text-red-700">No se guardó: {estado.error}</p>}
    </div>
  );
}

/** Registros que no corresponden al recorrido (ej.: se cambió el punto de partida). */
export function RegistrosSobrantes({ registros, puestos }: { registros: RegistroApi[]; puestos: PuestoDom[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  if (registros.length === 0) return null;
  return (
    <ul className="mt-2 grid gap-1 text-sm">
      {registros.map((r) => (
        <li key={r.id} className="flex items-center gap-2 rounded-md bg-red-50 px-2 py-1 text-red-800">
          {nombreTipo(r.tipo)} en {puestos.find((p) => p.id === r.puestoId)?.nombre}: {formatFechaHora(new Date(r.hora))}
          <button
            type="button"
            onClick={async () => {
              try {
                await api.borrarRegistro(r.id);
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Error");
              }
            }}
            className="ml-auto rounded-md border border-red-300 bg-white px-2 py-0.5 text-xs"
          >
            Borrar
          </button>
        </li>
      ))}
      {error && <li className="text-red-700">No se pudo borrar: {error}</li>}
    </ul>
  );
}
