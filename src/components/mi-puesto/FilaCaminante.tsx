"use client";

import Link from "next/link";
import { memo, useState } from "react";
import { formatHora } from "@/domain/hora";
import { registrosPlanificados, registrosVigentes } from "@/domain/recorrido";
import type { PuestoDom, TipoRegistro } from "@/domain/tipos";
import type { RegistroApi } from "@/lib/tipos-api";
import { claveCambio, hrefTelefono, puestoAbandono, type ClaveTipo, type FilaVista } from "@/lib/vista-puesto";
import { EditorHora } from "@/components/EditorHora";
import type { EstadoCambio } from "./useRegistrosPuesto";

interface Props {
  fila: FilaVista;
  puesto: PuestoDom;
  puestos: PuestoDom[];
  cambios: Map<string, EstadoCambio>;
  recientes: Set<string>;
  onMarcar: (caminanteId: string, tipo: TipoRegistro, descripcion: string) => void;
  onAbandono: (caminanteId: string, puestoId: string | null, anterior: string | null, descripcion: string) => void;
  onEditarHora: (registro: RegistroApi, hhmm: string) => void;
  onBorrar: (registro: RegistroApi) => void;
  onReintentar: (clave: string) => void;
  onDescartar: (clave: string) => void;
  onRefrescar: () => void;
}

const TIPOS: ClaveTipo[] = ["INGRESO", "SALIDA", "ABANDONO"];

export function etiqueta(tipo: ClaveTipo): string {
  if (tipo === "INGRESO") return "Ingresó";
  if (tipo === "ABANDONO") return "Abandonó";
  return "Salió";
}

function FilaCaminanteBase(props: Props) {
  const { fila, puesto, puestos, cambios, recientes, onMarcar, onAbandono, onEditarHora, onBorrar, onReintentar, onDescartar, onRefrescar } = props;
  const c = fila.caminante;
  const esPartida = fila.rol === "PARTIDA";
  const [editando, setEditando] = useState<TipoRegistro | null>(null);
  const [aviso, setAviso] = useState<"checkin" | "ingreso" | null>(null);

  const estado = (t: ClaveTipo) => cambios.get(claveCambio(c.id, t));
  const enviando = TIPOS.some((t) => estado(t)?.estado === "enviando");
  const errores = TIPOS.filter((t) => estado(t)?.estado === "error");
  const recien = !enviando && TIPOS.some((t) => recientes.has(claveCambio(c.id, t)));
  const planificados = registrosPlanificados(c, puesto, puestos);
  const vigentes = registrosVigentes(c, puesto, puestos);
  const abandonoEn = c.abandonoTrasPuestoId ? puestos.find((p) => p.id === c.abandonoTrasPuestoId) : null;

  // Sin check-in en la parroquia no se marca nada en los puestos.
  const faltaCheckin = !fila.checkin;
  // Para marcar la Salida tiene que haber llegado: si el puesto espera Ingreso y no está, se avisa
  const faltaIngreso = planificados.includes("INGRESO") && !fila.registro("INGRESO");

  function marcar(tipo: TipoRegistro) {
    if (faltaCheckin) {
      setAviso("checkin");
      onRefrescar(); // por si lo acaban de hacer en la parroquia
      return;
    }
    if (tipo === "SALIDA" && faltaIngreso) {
      setAviso("ingreso");
      return;
    }
    setAviso(null);
    onMarcar(c.id, tipo, `#${c.numero} ${c.nombreCompleto}: ${etiqueta(tipo).toLowerCase()}`);
  }

  function abandono() {
    if (abandonoEn) {
      if (confirm(`¿Quitar el abandono de #${c.numero} ${c.nombreCompleto}? (sigue caminando)`)) {
        onAbandono(c.id, null, abandonoEn.id, `#${c.numero}: abandono quitado`);
      }
      return;
    }
    const tras = puestoAbandono(fila, puesto, puestos);
    if (confirm(`¿#${c.numero} ${c.nombreCompleto} abandonó?\nSe marca "abandonó después de ${tras.nombre}".`)) {
      onAbandono(c.id, tras.id, null, `#${c.numero} ${c.nombreCompleto}: abandonó tras ${tras.nombre}`);
    }
  }

  const fondo = errores.length
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
        {esPartida && <span className="rounded bg-amber-200 px-1.5 text-xs font-semibold text-amber-900">Sale de acá</span>}
        <Link href={`/caminantes/${c.id}`} className="ml-auto py-1 pl-2 text-sm text-blue-700">
          Ficha ›
        </Link>
      </div>

      {(enviando || recien) && (
        <p
          role="status"
          className={`mt-1 inline-block rounded-md px-2 py-0.5 text-base font-bold ${
            enviando ? "animate-pulse bg-amber-500 text-white" : "bg-green-600 text-white"
          }`}
        >
          {enviando ? "⏳ Guardando…" : "✓ Guardado"}
        </p>
      )}

      {faltaCheckin && (
        <p className="mt-1 inline-block rounded bg-amber-200 px-1.5 text-sm font-semibold text-amber-900">Sin check-in</p>
      )}
      {c.dni && <p className="text-sm text-gray-600">DNI {c.dni}</p>}
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
      {c.notas && <p className="mt-1 text-sm italic text-gray-600">{c.notas}</p>}

      {/* Una sola fila de botones: Ingresó | Salió | Abandonó */}
      <div className="mt-2 flex gap-2">
        {(["INGRESO", "SALIDA"] as const)
          .filter((tipo) => planificados.includes(tipo))
          .map((tipo) => {
            const r = fila.registro(tipo);
            const guardando = estado(tipo)?.estado === "enviando";
            const texto = etiqueta(tipo);
            if (r) {
              return (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setEditando(editando === tipo ? null : tipo)}
                  className="min-h-14 flex-1 rounded-xl border-2 border-green-600 bg-white px-1 text-green-800"
                >
                  <span className="block text-xs font-semibold leading-tight">{texto}</span>
                  <span className="font-mono text-lg font-bold">{guardando ? "⏳" : "✓"} {formatHora(new Date(r.hora))}</span>
                </button>
              );
            }
            const habilitado = vigentes.includes(tipo);
            return (
              <button
                key={tipo}
                type="button"
                disabled={!habilitado}
                onClick={() => marcar(tipo)}
                className={`min-h-14 flex-1 rounded-xl px-1 text-base font-bold leading-tight shadow-sm disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none ${
                  tipo === "INGRESO" ? "bg-blue-600 text-white active:bg-blue-800" : "bg-green-600 text-white active:bg-green-800"
                }`}
              >
                {texto}
              </button>
            );
          })}
        {/* En su punto de partida solo se marca la Salida: si no vino, lo muestra el check-in
            (un abandono marcado por error se quita desde la ficha). */}
        {!esPartida && (
          <button
            type="button"
            onClick={abandono}
            className={`min-h-14 flex-1 rounded-xl px-1 text-base font-bold leading-tight ${
              abandonoEn ? "bg-gray-700 text-white" : "border-2 border-red-300 bg-white text-red-700 active:bg-red-50"
            }`}
          >
            {abandonoEn ? (
              <>
                <span className="block text-xs font-semibold">Abandonó tras</span>
                {estado("ABANDONO")?.estado === "enviando" ? "⏳ " : ""}
                {abandonoEn.nombre}
              </>
            ) : (
              "Abandonó"
            )}
          </button>
        )}
      </div>

      {((aviso === "checkin" && faltaCheckin) || (aviso === "ingreso" && faltaIngreso)) && (
        <div role="alert" className="mt-2 flex items-start gap-2 rounded-md border-2 border-amber-500 bg-amber-50 p-2 text-amber-900">
          {aviso === "checkin" ? (
            <p className="flex-1">
              <b>No hizo el check-in.</b> #{c.numero} tiene que hacer el check-in en la parroquia antes de que se le pueda marcar
              algo en los puestos. Si ya lo hizo, en unos segundos se actualiza solo.
            </p>
          ) : (
            <p className="flex-1">
              <b>Primero tiene que llegar.</b> Marcá <b>Ingresó</b> para #{c.numero} y después vas a poder marcar la Salida.
            </p>
          )}
          <button type="button" onClick={() => setAviso(null)} className="px-2 text-lg font-bold" aria-label="Cerrar aviso">
            ✕
          </button>
        </div>
      )}

      {editando && fila.registro(editando) && (
        <EditorHora
          registro={fila.registro(editando)!}
          titulo={etiqueta(editando)}
          onGuardar={(hhmm) => {
            onEditarHora(fila.registro(editando)!, hhmm);
            setEditando(null);
          }}
          onBorrar={() => {
            if (confirm(`¿Borrar "${etiqueta(editando)}" de #${c.numero}?`)) {
              onBorrar(fila.registro(editando)!);
              setEditando(null);
            }
          }}
          onCancelar={() => setEditando(null)}
        />
      )}

      {errores.map((tipo) => {
        const e = estado(tipo)!;
        const clave = claveCambio(c.id, tipo);
        const accion = e.cambio.accion === "borrar" ? "borrar " : e.cambio.accion === "abandono" && !e.cambio.puestoId ? "quitar " : "";
        return (
          <div key={tipo} className="mt-2 rounded-md border-2 border-red-400 bg-white p-2 text-red-800">
            <p>
              <b>⚠️ NO SE GUARDÓ</b> ({accion}
              {etiqueta(tipo)}): {e.error}
            </p>
            <div className="mt-2 flex gap-2">
              {e.reintentable && (
                <button type="button" onClick={() => onReintentar(clave)} className="min-h-12 flex-1 rounded-md bg-red-600 font-semibold text-white">
                  Reintentar
                </button>
              )}
              <button type="button" onClick={() => onDescartar(clave)} className="min-h-12 flex-1 rounded-md border border-red-300">
                Descartar
              </button>
            </div>
          </div>
        );
      })}
    </li>
  );
}

export const FilaCaminante = memo(FilaCaminanteBase);
