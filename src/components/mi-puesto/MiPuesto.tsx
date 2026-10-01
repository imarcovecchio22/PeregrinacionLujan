"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatHora } from "@/domain/hora";
import { estadoPuesto } from "@/domain/recorrido";
import { guardarDispositivo, useDispositivo } from "@/lib/dispositivo";
import type { DatosPuesto } from "@/lib/tipos-api";
import { agrupar, armarFila, caminanteDe, coincide, ORDEN_GRUPOS, type Grupo } from "@/lib/vista-puesto";
import { Contadores } from "./Contadores";
import { FilaCaminante } from "./FilaCaminante";
import { useRegistrosPuesto } from "./useRegistrosPuesto";

export function MiPuesto({ inicial }: { inicial: DatosPuesto }) {
  const dispositivo = useDispositivo();
  const nombre = dispositivo?.nombre ?? "";
  const s = useRegistrosPuesto(inicial, nombre);
  const { puesto, puestos } = s.datos;
  const [busqueda, setBusqueda] = useState("");

  // Quien abre el link de un puesto queda "en" ese puesto.
  useEffect(() => {
    if (dispositivo && dispositivo.puestoId !== puesto.id) guardarDispositivo({ puestoId: puesto.id });
  }, [dispositivo, puesto.id]);

  const filas = useMemo(() => s.filas.map((f) => armarFila(f, puesto, puestos)), [s.filas, puesto, puestos]);
  const estado = useMemo(
    () =>
      estadoPuesto(
        puesto,
        filas.map((f) => f.caminante),
        puestos,
        filas.flatMap((f) => f.registros.map((r) => ({ ...r, hora: new Date(r.hora) }))),
      ),
    [filas, puesto, puestos],
  );
  const errores = [...s.cambios.values()].filter((c) => c.estado === "error");
  const enviando = [...s.cambios.values()].filter((c) => c.estado === "enviando").length;
  const idsConError = useMemo(
    () => new Set([...s.cambios.values()].filter((c) => c.estado === "error").map((c) => caminanteDe(c.cambio))),
    [s.cambios],
  );

  // Mientras una fila se guarda (y unos segundos después) queda en el grupo donde estaba,
  // para que se vea el "✓ Guardado" en vez de saltar a otra sección.
  const [fijas, setFijas] = useState<Map<string, Grupo>>(() => new Map());
  const activos = useMemo(
    () =>
      new Set([
        ...[...s.cambios.values()].filter((c) => c.estado === "enviando").map((c) => caminanteDe(c.cambio)),
        ...[...s.recientes].map((clave) => clave.split(":")[0]),
      ]),
    [s.cambios, s.recientes],
  );
  const fijasVigentes = useMemo(() => new Map([...fijas].filter(([id]) => activos.has(id))), [fijas, activos]);
  const fijar = useCallback(
    (caminanteId: string) => {
      const f = filas.find((x) => x.caminante.id === caminanteId);
      if (f) setFijas((m) => new Map(m).set(caminanteId, fijasVigentes.get(caminanteId) ?? f.grupo));
    },
    [filas, fijasVigentes],
  );
  const { marcar: marcarBase, marcarAbandono: abandonoBase } = s;
  const marcar = useCallback<typeof marcarBase>(
    (id, tipo, desc) => {
      fijar(id);
      marcarBase(id, tipo, desc);
    },
    [fijar, marcarBase],
  );
  const marcarAbandono = useCallback<typeof abandonoBase>(
    (id, puestoId, anterior, desc) => {
      fijar(id);
      abandonoBase(id, puestoId, anterior, desc);
    },
    [fijar, abandonoBase],
  );

  const grupos = useMemo(
    () => agrupar(filas.filter((f) => coincide(f, busqueda)), idsConError, fijasVigentes),
    [filas, busqueda, idsConError, fijasVigentes],
  );
  const titulos: Record<Grupo, string> = {
    SIN_GUARDAR: "⚠️ Sin guardar",
    FALTAN_LLEGAR: puesto.registraIngreso ? "Faltan llegar" : "Faltan presentarse",
    EN_EL_PUESTO: "En el puesto (falta la salida)",
    COMPLETOS: "Completos",
    ABANDONARON: "Abandonaron",
  };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg bg-white pb-28">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-3 pt-2 pb-2 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <Link href="/?cambiar=1" className="py-1 pr-2 text-sm text-blue-700">
            ← Puestos
          </Link>
          <h1 className="truncate text-lg font-bold">
            {puesto.orden}. {puesto.nombre}
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
        <div className="mt-2">
          <Contadores estado={estado} />
        </div>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, número o teléfono"
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

      {ORDEN_GRUPOS.map((g) => {
        const lista = grupos[g];
        if (lista.length === 0) return null;
        const items = (
          <ul>
            {lista.map((f) => (
              <FilaCaminante
                key={f.caminante.id}
                fila={f}
                puesto={puesto}
                puestos={puestos}
                cambios={s.cambios}
                recientes={s.recientes}
                onMarcar={marcar}
                onAbandono={marcarAbandono}
                onEditarHora={s.editarHora}
                onBorrar={s.borrar}
                onReintentar={s.reintentar}
                onDescartar={s.descartar}
              />
            ))}
          </ul>
        );
        const encabezado = `${titulos[g]} (${lista.length})`;
        const plegado = (g === "COMPLETOS" || g === "ABANDONARON") && !busqueda;
        return plegado ? (
          <details key={g} className="border-t border-gray-200">
            <summary className="cursor-pointer bg-gray-100 px-3 py-3 font-semibold text-gray-700">{encabezado}</summary>
            {items}
          </details>
        ) : (
          <section key={g}>
            <h2 className="bg-gray-100 px-3 py-2 font-semibold text-gray-800">{encabezado}</h2>
            {items}
          </section>
        );
      })}
      {filas.length > 0 && ORDEN_GRUPOS.every((g) => grupos[g].length === 0) && (
        <p className="p-6 text-center text-gray-500">Nadie coincide con &quot;{busqueda}&quot;.</p>
      )}

      {s.aviso && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg p-3">
          <div
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-white shadow-lg ${
              s.aviso.tipo === "alerta" ? "bg-amber-700" : "bg-gray-900"
            }`}
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

function PedirNombre() {
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

/** Indicador grande de guardado, siempre visible arriba (header fijo). */
function EstadoGuardado(props: { errores: number; enviando: number; guardado: boolean; onReintentar?: () => void }) {
  const { errores, enviando, guardado, onReintentar } = props;
  if (errores > 0) {
    return (
      <div role="alert" className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-red-600 px-3 py-2 text-white">
        <span className="text-lg font-bold">⚠️ {errores === 1 ? "1 cambio sin guardar" : `${errores} cambios sin guardar`}</span>
        {onReintentar && (
          <button type="button" onClick={onReintentar} className="rounded-md bg-white px-3 py-2 font-semibold text-red-700">
            Reintentar
          </button>
        )}
      </div>
    );
  }
  if (enviando > 0) {
    return (
      <p role="status" className="mt-2 animate-pulse rounded-lg bg-amber-500 px-3 py-2 text-center text-lg font-bold text-white">
        ⏳ Guardando{enviando > 1 ? ` ${enviando}` : ""}…
      </p>
    );
  }
  if (guardado) {
    return (
      <p role="status" className="mt-2 rounded-lg bg-green-600 px-3 py-2 text-center text-lg font-bold text-white">
        ✓ Guardado
      </p>
    );
  }
  return null;
}
