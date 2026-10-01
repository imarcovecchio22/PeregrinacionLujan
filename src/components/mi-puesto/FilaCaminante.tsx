"use client";

import { memo, useState } from "react";
import { formatHora } from "@/domain/hora";
import type { PuestoDom, TipoRegistro } from "@/domain/tipos";
import type { RegistroApi } from "@/lib/tipos-api";
import { claveCambio, hrefTelefono, type FilaVista } from "@/lib/vista-puesto";
import type { EstadoCambio } from "./useRegistrosPuesto";

interface Props {
  fila: FilaVista;
  puestos: PuestoDom[];
  cambios: Map<string, EstadoCambio>;
  onMarcar: (caminanteId: string, tipo: TipoRegistro, descripcion: string) => void;
  onEditarHora: (registro: RegistroApi, hhmm: string) => void;
  onBorrar: (registro: RegistroApi) => void;
  onReintentar: (clave: string) => void;
  onDescartar: (clave: string) => void;
}

export function etiqueta(tipo: TipoRegistro, esPartida: boolean): string {
  if (tipo === "INGRESO") return "Ingresó";
  return esPartida ? "Presente / Salió" : "Salió";
}

function FilaCaminanteBase({ fila, puestos, cambios, onMarcar, onEditarHora, onBorrar, onReintentar, onDescartar }: Props) {
  const c = fila.caminante;
  const esPartida = fila.rol === "PARTIDA";
  const [editando, setEditando] = useState<TipoRegistro | null>(null);
  const abandono = c.abandonoTrasPuestoId ? puestos.find((p) => p.id === c.abandonoTrasPuestoId)?.nombre : null;
  const estados = (["INGRESO", "SALIDA"] as const)
    .map((tipo) => ({ tipo, clave: claveCambio(c.id, tipo), estado: cambios.get(claveCambio(c.id, tipo)) }))
    .filter((x) => x.estado);
  const errores = estados.filter((x) => x.estado!.estado === "error");
  const [principal, secundario] = fila.pendientes;
  const marcar = (tipo: TipoRegistro) =>
    onMarcar(c.id, tipo, `#${c.numero} ${c.nombreCompleto}: ${etiqueta(tipo, esPartida).toLowerCase()}`);

  return (
    <li className={`border-b border-gray-200 px-3 py-3 ${errores.length ? "bg-red-50" : ""}`}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-lg font-bold">#{c.numero}</span>
        <span className="text-lg leading-tight">{c.nombreCompleto}</span>
        {esPartida && <span className="rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">Sale de acá</span>}
        {abandono && (
          <span className="rounded bg-gray-200 px-1.5 text-xs font-semibold text-gray-700">Abandonó tras {abandono}</span>
        )}
      </div>

      {c.telefonos.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {c.telefonos.map((t) => {
            const href = hrefTelefono(t);
            return href ? (
              <a key={t} href={href} className="rounded-full border border-blue-300 px-3 py-1 text-sm text-blue-700 active:bg-blue-100">
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

      {fila.registros.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {(["INGRESO", "SALIDA"] as const).map((tipo) => {
            const r = fila.registro(tipo);
            if (!r) return null;
            const estado = cambios.get(claveCambio(c.id, tipo))?.estado;
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => setEditando(editando === tipo ? null : tipo)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
              >
                {etiqueta(tipo, esPartida)} <b className="font-mono">{formatHora(new Date(r.hora))}</b>{" "}
                {estado === "enviando" ? "⏳" : estado === "error" ? "⚠️" : "✏️"}
              </button>
            );
          })}
        </div>
      )}

      {editando && fila.registro(editando) && (
        <EditorHora
          registro={fila.registro(editando)!}
          titulo={etiqueta(editando, esPartida)}
          onGuardar={(hhmm) => {
            onEditarHora(fila.registro(editando)!, hhmm);
            setEditando(null);
          }}
          onBorrar={() => {
            if (confirm(`¿Borrar "${etiqueta(editando, esPartida)}" de #${c.numero}?`)) {
              onBorrar(fila.registro(editando)!);
              setEditando(null);
            }
          }}
          onCancelar={() => setEditando(null)}
        />
      )}

      {errores.map(({ tipo, clave, estado }) => (
        <div key={tipo} className="mt-2 rounded-md border border-red-300 bg-white p-2 text-sm text-red-800">
          <p>
            <b>No se guardó</b> ({estado!.cambio.accion === "borrar" ? "borrar " : ""}
            {etiqueta(tipo, esPartida)}): {estado!.error}
          </p>
          <div className="mt-2 flex gap-2">
            {estado!.reintentable && (
              <button type="button" onClick={() => onReintentar(clave)} className="flex-1 rounded-md bg-red-600 py-2 font-semibold text-white">
                Reintentar
              </button>
            )}
            <button type="button" onClick={() => onDescartar(clave)} className="flex-1 rounded-md border border-red-300 py-2">
              Descartar
            </button>
          </div>
        </div>
      ))}

      {principal && (
        <div className="mt-2 flex gap-2">
          <BotonMarcar tipo={principal} texto={etiqueta(principal, esPartida)} onClick={() => marcar(principal)} grande />
          {secundario && (
            <BotonMarcar tipo={secundario} texto={etiqueta(secundario, esPartida)} onClick={() => marcar(secundario)} />
          )}
        </div>
      )}
    </li>
  );
}

export const FilaCaminante = memo(FilaCaminanteBase);

function BotonMarcar({ tipo, texto, onClick, grande }: { tipo: TipoRegistro; texto: string; onClick: () => void; grande?: boolean }) {
  const color =
    tipo === "INGRESO" ? "bg-blue-600 active:bg-blue-800 text-white" : "bg-green-600 active:bg-green-800 text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        grande
          ? `min-h-14 flex-[2] rounded-xl text-lg font-bold shadow-sm ${color}`
          : "min-h-14 flex-1 rounded-xl border-2 border-gray-300 bg-white text-base font-semibold text-gray-700"
      }
    >
      {texto}
    </button>
  );
}

function EditorHora({
  registro,
  titulo,
  onGuardar,
  onBorrar,
  onCancelar,
}: {
  registro: RegistroApi;
  titulo: string;
  onGuardar: (hhmm: string) => void;
  onBorrar: () => void;
  onCancelar: () => void;
}) {
  const [hhmm, setHhmm] = useState(formatHora(new Date(registro.hora)));
  return (
    <div className="mt-2 rounded-md border border-gray-300 bg-gray-50 p-2">
      <label className="flex items-center gap-2 text-sm">
        Hora de &quot;{titulo}&quot;
        <input
          type="time"
          value={hhmm}
          onChange={(e) => setHhmm(e.target.value)}
          className="rounded border border-gray-400 bg-white px-2 py-1 text-lg"
        />
      </label>
      {registro.cargadoPor && <p className="mt-1 text-xs text-gray-500">Cargado por {registro.cargadoPor}</p>}
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => hhmm && onGuardar(hhmm)} className="flex-1 rounded-md bg-gray-800 py-2 font-semibold text-white">
          Guardar
        </button>
        <button type="button" onClick={onCancelar} className="flex-1 rounded-md border border-gray-300 bg-white py-2">
          Cancelar
        </button>
        <button type="button" onClick={onBorrar} className="rounded-md border border-red-300 bg-white px-3 py-2 text-red-700">
          Borrar
        </button>
      </div>
    </div>
  );
}
