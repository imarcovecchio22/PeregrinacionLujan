"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EstadoGuardado } from "@/components/EstadoGuardado";
import { PedirNombre } from "@/components/PedirNombre";
import { formatHora } from "@/domain/hora";
import { NOMBRE_TRAMO } from "@/domain/micros";
import { guardarDispositivo, useDispositivo } from "@/lib/dispositivo";
import type { DatosMicro } from "@/lib/tipos-api";
import { turnoActual } from "@/domain/checkin";
import { agruparMicro, filasDelTurno, grupoMicro, ORDEN_GRUPOS_MICRO, textosTramo, type GrupoMicro } from "@/lib/vista-micro";
import { FilaMicro } from "./FilaMicro";
import { useAbordajes } from "./useAbordajes";

export const claveDispositivoMicro = (tramo: string) => `micro:${tramo.toLowerCase()}`;

export function MiMicro({ inicial }: { inicial: DatosMicro }) {
  const dispositivo = useDispositivo();
  const nombre = dispositivo?.nombre ?? "";
  const s = useAbordajes(inicial, nombre);
  const [busqueda, setBusqueda] = useState("");
  const [abiertos, setAbiertos] = useState<Set<GrupoMicro>>(() => new Set<GrupoMicro>(["FALTAN", "EXTRAS"]));
  const textos = textosTramo(s.tramo);

  // Check-in: un turno por vez (arranca en el que corresponde a esta hora).
  const esCheckin = s.tramo === "CHECKIN";
  // Los turnos vienen con cada actualización (si cambian las horas en /admin, se ajusta solo).
  const turnos = s.turnos;
  const [elegido, setTurno] = useState<string | null | undefined>(undefined);
  const turno = turnos.some((t) => t.hora === elegido)
    ? (elegido ?? null)
    : (turnoActual(turnos, formatHora(new Date()))?.hora ?? null);
  const filas = useMemo(() => (esCheckin ? filasDelTurno(s.filas, turno) : s.filas), [esCheckin, s.filas, turno]);

  // Este celular queda "en" este micro (al abrir la app vuelve acá).
  useEffect(() => {
    const clave = claveDispositivoMicro(s.tramo);
    if (dispositivo && dispositivo.puestoId !== clave) guardarDispositivo({ puestoId: clave });
  }, [dispositivo, s.tramo]);

  // `esperado` viene calculado del servidor (abandonos incluidos); los contadores salen de las filas.
  const esperados = filas.filter((f) => f.esperado);
  const subieron = esperados.filter((f) => f.abordaje).length;
  // En el check-in, los de otro turno no cuentan acá (tienen su pestaña).
  const extras = esCheckin ? 0 : filas.filter((f) => !f.esperado && f.abordaje).length;

  const errores = [...s.cambios.values()].filter((c) => c.estado === "error");
  const enviando = [...s.cambios.values()].filter((c) => c.estado === "enviando").length;
  const conError = useMemo(
    () => new Set([...s.cambios].filter(([, c]) => c.estado === "error").map(([id]) => id)),
    [s.cambios],
  );

  // Fila que se está guardando: queda en su sección hasta que se vea el "✓ Guardado".
  const [fijas, setFijas] = useState<Map<string, GrupoMicro>>(() => new Map());
  const activos = useMemo(
    () => new Set([...[...s.cambios].filter(([, c]) => c.estado === "enviando").map(([id]) => id), ...s.recientes]),
    [s.cambios, s.recientes],
  );
  const fijasVigentes = useMemo(() => new Map([...fijas].filter(([id]) => activos.has(id))), [fijas, activos]);
  const { marcarSubio: marcarBase } = s;
  const marcarSubio = useCallback(
    (id: string, desc: string) => {
      const f = filas.find((x) => x.caminante.id === id);
      const g = f ? grupoMicro(f, !esCheckin) : null;
      if (g) setFijas((m) => new Map(m).set(id, fijasVigentes.get(id) ?? g));
      marcarBase(id, desc);
    },
    [filas, fijasVigentes, marcarBase, esCheckin],
  );

  const { grupos, noAnotados } = useMemo(
    () => agruparMicro(filas, busqueda, conError, fijasVigentes, !esCheckin),
    [filas, busqueda, conError, fijasVigentes, esCheckin],
  );
  const titulos: Record<GrupoMicro, string> = {
    SIN_GUARDAR: "⚠️ Sin guardar",
    FALTAN: textos.faltan,
    EXTRAS: textos.extras,
    SUBIERON: textos.hicieron,
  };
  const fila = (f: (typeof filas)[number]) => (
    <FilaMicro
      key={f.caminante.id}
      fila={f}
      textos={textos}
      estado={s.cambios.get(f.caminante.id)}
      reciente={s.recientes.has(f.caminante.id)}
      onSubio={marcarSubio}
      onEditarHora={s.editarHora}
      onBorrar={s.borrar}
      onReintentar={s.reintentar}
      onDescartar={s.descartar}
    />
  );
  const nada = ORDEN_GRUPOS_MICRO.every((g) => grupos[g].length === 0);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg bg-white pb-28">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-3 pt-2 pb-2 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <Link href="/?cambiar=1" className="py-1 pr-2 text-sm text-blue-700">
            ← Inicio
          </Link>
          <h1 className="truncate text-lg font-bold">
            {textos.icono} {NOMBRE_TRAMO[s.tramo]}
          </h1>
          <button type="button" onClick={s.refrescar} className="py-1 pl-2 text-right text-xs text-gray-600">
            {s.conexion.ok ? "🟢" : "🔴"} {formatHora(new Date(s.conexion.ultima))}
          </button>
        </div>
        <EstadoGuardado
          errores={errores.length}
          enviando={enviando}
          guardado={s.recientes.size > 0}
          onReintentar={errores.some((e) => e.reintentable) ? s.reintentarTodo : undefined}
        />
        {esCheckin && turnos.length > 1 && (
          <div className="mt-2 grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-gray-100 p-1" role="tablist">
            {turnos.map((t) => {
              const faltan = s.filas.filter((f) => f.turno === t.hora && !f.abordaje).length;
              const activo = t.hora === turno;
              return (
                <button
                  key={t.hora ?? "sin"}
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  onClick={() => {
                    setTurno(t.hora);
                    setFijas(new Map());
                  }}
                  className={`min-h-12 rounded-lg px-2 py-1 text-left leading-tight ${activo ? "bg-blue-700 text-white shadow" : "text-gray-800"}`}
                >
                  <span className="block text-lg font-bold">{t.hora ?? "Sin horario"}</span>
                  <span className="block text-xs">
                    {t.nombre.split(" · ")[1]} · faltan {faltan}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className={`rounded-lg border px-2 py-1 text-center ${esperados.length - subieron === 0 ? "border-gray-300 bg-gray-50 text-gray-500" : "border-green-300 bg-green-50 text-green-900"}`}>
            <div className="text-xs font-medium">{textos.faltan}</div>
            <div className="font-mono text-2xl leading-tight font-bold">
              {esperados.length - subieron}
              <span className="text-sm font-normal"> / {esperados.length}</span>
            </div>
          </div>
          <div className="rounded-lg border border-gray-300 px-2 py-1 text-center">
            <div className="text-xs font-medium">{textos.hicieron}</div>
            <div className="font-mono text-2xl leading-tight font-bold">{subieron + extras}</div>
          </div>
        </div>
        {extras > 0 && (
          <p className="mt-1 text-center text-xs text-gray-600">
            Incluye {extras} que no estaban anotados
          </p>
        )}
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, número o DNI"
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-base"
          enterKeyHint="search"
        />
      </header>

      {dispositivo && !nombre && <PedirNombre />}
      {!s.conexion.ok && (
        <div className="bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Sin conexión con el servidor. Mostrando datos de las {formatHora(new Date(s.conexion.ultima))}.
        </div>
      )}

      {ORDEN_GRUPOS_MICRO.map((g) => {
        const lista = grupos[g];
        if (lista.length === 0) return null;
        const encabezado = `${titulos[g]} (${lista.length})`;
        if (g === "SIN_GUARDAR") {
          return (
            <section key={g}>
              <h2 className="bg-red-100 px-3 py-3 font-semibold text-red-900">{encabezado}</h2>
              <ul>{lista.map(fila)}</ul>
            </section>
          );
        }
        return (
          <details
            key={g}
            open={!!busqueda || abiertos.has(g)}
            onToggle={(e) => {
              if (busqueda) return;
              const abierto = e.currentTarget.open;
              setAbiertos((prev) => {
                if (prev.has(g) === abierto) return prev;
                const n = new Set(prev);
                if (abierto) n.add(g);
                else n.delete(g);
                return n;
              });
            }}
            className="border-t border-gray-200"
          >
            <summary className="cursor-pointer bg-gray-100 px-3 py-3 font-semibold text-gray-800 select-none">{encabezado}</summary>
            <ul>{lista.map(fila)}</ul>
          </details>
        );
      })}

      {noAnotados.length > 0 && (
        <section className="m-3 rounded-lg border-2 border-amber-400 bg-amber-50">
          <h2 className="px-3 pt-3 font-semibold text-amber-900">{textos.noAnotado}</h2>
          <ul className="mt-2">{noAnotados.slice(0, 10).map(fila)}</ul>
        </section>
      )}
      {busqueda && nada && noAnotados.length === 0 && (
        <p className="p-6 text-center text-gray-500">Nadie coincide con &quot;{busqueda}&quot;.</p>
      )}

      <p className="p-4 text-center text-xs text-gray-400">Versión {process.env.NEXT_PUBLIC_VERSION}</p>

      {s.aviso && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg p-3">
          <div
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-white shadow-lg ${s.aviso.tipo === "alerta" ? "bg-amber-700" : "bg-gray-900"}`}
          >
            <span className="flex-1 text-sm">{s.aviso.texto}</span>
            {s.aviso.deshacer && (
              <button
                type="button"
                onClick={() => {
                  s.aviso?.deshacer?.();
                  s.cerrarAviso();
                }}
                className="rounded-md bg-white px-3 py-2 font-semibold text-gray-900"
              >
                Deshacer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
