"use client";

// Estado de la pantalla de micro (mismo esquema que useRegistrosPuesto): cambios que se ven
// al instante, envío en orden por caminante, errores visibles con reintento, "recién
// guardado" unos segundos y refresco cada 20 s.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { horaEditada } from "@/domain/hora";
import type { Tramo } from "@/domain/micros";
import * as api from "@/lib/api-cliente";
import type { AbordajeApi, DatosMicro } from "@/lib/tipos-api";

const REFRESCO_MS = 20_000;
const RECIEN_GUARDADO_MS = 2_500;

export type CambioAbordaje = { accion: "subio" | "borrar"; abordaje: AbordajeApi };

export interface EstadoCambioAbordaje {
  cambio: CambioAbordaje;
  estado: "enviando" | "error";
  error?: string;
  reintentable?: boolean;
}

export interface AvisoMicro {
  id: number;
  texto: string;
  deshacer?: () => void;
  tipo?: "info" | "alerta";
}

export function useAbordajes(inicial: DatosMicro, cargadoPor: string) {
  const tramo: Tramo = inicial.tramo;
  const [datos, setDatos] = useState(inicial);
  /** Clave: id del caminante. */
  const [cambios, setCambios] = useState<Map<string, EstadoCambioAbordaje>>(() => new Map());
  const [recientes, setRecientes] = useState<Set<string>>(() => new Set());
  const [conexion, setConexion] = useState({ ok: true, ultima: inicial.generado });
  const [aviso, setAviso] = useState<AvisoMicro | null>(null);
  const colas = useRef(new Map<string, Promise<void>>());
  const temporizadores = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const ultimaConfirmacion = useRef(0);

  const avisar = useCallback((a: Omit<AvisoMicro, "id">) => setAviso({ ...a, id: Date.now() }), []);

  const marcarReciente = useCallback((id: string) => {
    setRecientes((s) => new Set(s).add(id));
    clearTimeout(temporizadores.current.get(id));
    temporizadores.current.set(
      id,
      setTimeout(() => {
        setRecientes((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      }, RECIEN_GUARDADO_MS),
    );
  }, []);

  useEffect(() => {
    const t = temporizadores.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const enviar = useCallback(
    (cambio: CambioAbordaje) => {
      const id = cambio.abordaje.caminanteId;
      setCambios((m) => new Map(m).set(id, { cambio, estado: "enviando" }));
      const siguiente = (colas.current.get(id) ?? Promise.resolve()).then(async () => {
        try {
          let confirmado: AbordajeApi | null = null;
          if (cambio.accion === "subio") {
            const res = await api.guardarAbordaje(cambio.abordaje);
            confirmado = res.abordaje;
            if (res.yaExistia) {
              avisar({
                tipo: "alerta",
                texto: `Ya estaba marcado${res.abordaje.cargadoPor ? ` por ${res.abordaje.cargadoPor}` : ""}. Se dejó ese.`,
              });
            }
          } else {
            await api.borrarAbordaje(cambio.abordaje.id);
          }
          ultimaConfirmacion.current = Date.now();
          setDatos((d) => ({
            ...d,
            filas: d.filas.map((f) => (f.caminante.id === id ? { ...f, abordaje: confirmado } : f)),
          }));
          setCambios((m) => {
            if (m.get(id)?.cambio !== cambio) return m;
            const n = new Map(m);
            n.delete(id);
            return n;
          });
          marcarReciente(id);
        } catch (e) {
          const err = e instanceof api.ErrorApi ? e : new api.ErrorApi("Error inesperado", true);
          setCambios((m) =>
            m.get(id)?.cambio !== cambio
              ? m
              : new Map(m).set(id, { cambio, estado: "error", error: err.message, reintentable: err.reintentable }),
          );
        }
      });
      colas.current.set(id, siguiente);
    },
    [avisar, marcarReciente],
  );

  const refrescar = useCallback(async () => {
    const inicio = Date.now();
    try {
      const nuevos = await api.obtenerMicro(tramo);
      if (ultimaConfirmacion.current > inicio) return; // respuesta vieja
      setDatos(nuevos);
      setConexion({ ok: true, ultima: nuevos.generado });
    } catch {
      setConexion((c) => ({ ...c, ok: false }));
    }
  }, [tramo]);

  const reintentarTodo = useCallback(() => {
    for (const c of cambios.values()) if (c.estado === "error" && c.reintentable) enviar(c.cambio);
  }, [cambios, enviar]);

  useEffect(() => {
    const visible = () => document.visibilityState === "visible";
    const intervalo = setInterval(() => visible() && refrescar(), REFRESCO_MS);
    const alVolver = () => visible() && refrescar();
    const alReconectar = () => {
      refrescar();
      reintentarTodo();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("online", alReconectar);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("online", alReconectar);
    };
  }, [refrescar, reintentarTodo]);

  const hayPendientes = cambios.size > 0;
  useEffect(() => {
    if (!hayPendientes) return;
    const alSalir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [hayPendientes]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), aviso.deshacer ? 8000 : 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  const marcarSubio = useCallback(
    (caminanteId: string, descripcion: string) => {
      const abordaje: AbordajeApi = {
        id: api.nuevoId(),
        caminanteId,
        tramo,
        hora: new Date().toISOString(),
        cargadoPor: cargadoPor || null,
      };
      enviar({ accion: "subio", abordaje });
      avisar({ texto: descripcion, deshacer: () => enviar({ accion: "borrar", abordaje }) });
    },
    [tramo, cargadoPor, enviar, avisar],
  );

  const editarHora = useCallback(
    (abordaje: AbordajeApi, hhmm: string) => {
      const hora = horaEditada(new Date(abordaje.hora), hhmm).toISOString();
      enviar({ accion: "subio", abordaje: { ...abordaje, hora, cargadoPor: cargadoPor || abordaje.cargadoPor } });
    },
    [cargadoPor, enviar],
  );

  const borrar = useCallback((abordaje: AbordajeApi) => enviar({ accion: "borrar", abordaje }), [enviar]);

  const reintentar = useCallback(
    (id: string) => {
      const c = cambios.get(id);
      if (c) enviar(c.cambio);
    },
    [cambios, enviar],
  );

  const descartar = useCallback((id: string) => {
    setCambios((m) => {
      const n = new Map(m);
      n.delete(id);
      return n;
    });
  }, []);

  /** Filas con los cambios locales aplicados. */
  const filas = useMemo(
    () =>
      datos.filas.map((f) => {
        const c = cambios.get(f.caminante.id)?.cambio;
        if (!c) return f;
        return { ...f, abordaje: c.accion === "subio" ? c.abordaje : null };
      }),
    [datos.filas, cambios],
  );

  return {
    tramo,
    filas,
    cambios,
    recientes,
    conexion,
    aviso,
    cerrarAviso: () => setAviso(null),
    refrescar,
    marcarSubio,
    editarHora,
    borrar,
    reintentar,
    reintentarTodo,
    descartar,
  };
}
