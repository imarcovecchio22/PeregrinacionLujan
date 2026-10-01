"use client";

// Estado de la vista "Mi puesto":
// - datos del servidor, refrescados cada 20 s (y al volver a la pestaña o recuperar señal);
// - cambios locales que se muestran al instante y se envían en orden por caminante+tipo;
// - si un envío falla queda marcado con error para reintentar (nunca se pierde en silencio).
// Fase 2: persistir `cambios` en el dispositivo para tener modo offline real.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { horaEditada } from "@/domain/hora";
import type { TipoRegistro } from "@/domain/tipos";
import * as api from "@/lib/api-cliente";
import type { DatosPuesto, RegistroApi } from "@/lib/tipos-api";
import { claveCambio, combinar, type CambioLocal } from "@/lib/vista-puesto";

const REFRESCO_MS = 20_000;

export interface EstadoCambio {
  cambio: CambioLocal;
  estado: "enviando" | "error";
  error?: string;
  reintentable?: boolean;
}

export interface Aviso {
  id: number;
  texto: string;
  deshacer?: () => void;
  tipo?: "info" | "alerta";
}

export function useRegistrosPuesto(inicial: DatosPuesto, cargadoPor: string) {
  const puestoId = inicial.puesto.id;
  const [datos, setDatos] = useState(inicial);
  const [cambios, setCambios] = useState<Map<string, EstadoCambio>>(() => new Map());
  const [conexion, setConexion] = useState({ ok: true, ultima: inicial.generado });
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const colas = useRef(new Map<string, Promise<void>>());
  const ultimaConfirmacion = useRef(0);

  const avisar = useCallback((a: Omit<Aviso, "id">) => setAviso({ ...a, id: Date.now() }), []);

  const enviar = useCallback(
    (cambio: CambioLocal) => {
      const { caminanteId, tipo } = cambio.registro;
      const clave = claveCambio(caminanteId, tipo);
      setCambios((m) => new Map(m).set(clave, { cambio, estado: "enviando" }));

      const siguiente = (colas.current.get(clave) ?? Promise.resolve()).then(async () => {
        try {
          let confirmado: RegistroApi | null = null;
          if (cambio.accion === "guardar") {
            const res = await api.guardarRegistro(cambio.registro);
            confirmado = res.registro;
            if (res.yaExistia) {
              avisar({
                tipo: "alerta",
                texto: `Ya estaba registrado${res.registro.cargadoPor ? ` por ${res.registro.cargadoPor}` : ""}. Se dejó ese registro.`,
              });
            }
          } else {
            await api.borrarRegistro(cambio.registro.id);
          }
          ultimaConfirmacion.current = Date.now();
          setDatos((d) => ({
            ...d,
            filas: d.filas.map((f) =>
              f.caminante.id !== caminanteId
                ? f
                : { ...f, registros: [...f.registros.filter((r) => r.tipo !== tipo), ...(confirmado ? [confirmado] : [])] },
            ),
          }));
          setCambios((m) => {
            if (m.get(clave)?.cambio !== cambio) return m; // hubo un cambio posterior
            const n = new Map(m);
            n.delete(clave);
            return n;
          });
        } catch (e) {
          const err = e instanceof api.ErrorApi ? e : new api.ErrorApi("Error inesperado", true);
          setCambios((m) =>
            m.get(clave)?.cambio !== cambio
              ? m
              : new Map(m).set(clave, { cambio, estado: "error", error: err.message, reintentable: err.reintentable }),
          );
        }
      });
      colas.current.set(clave, siguiente);
    },
    [avisar],
  );

  const refrescar = useCallback(async () => {
    const inicio = Date.now();
    try {
      const nuevos = await api.obtenerPuesto(puestoId);
      // Si mientras tanto se confirmó un cambio, esta respuesta puede estar vieja: se descarta.
      if (ultimaConfirmacion.current > inicio) return;
      setDatos(nuevos);
      setConexion({ ok: true, ultima: nuevos.generado });
    } catch {
      setConexion((c) => ({ ...c, ok: false }));
    }
  }, [puestoId]);

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

  // Avisar antes de cerrar la página si quedan cosas sin guardar.
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

  const marcar = useCallback(
    (caminanteId: string, tipo: TipoRegistro, descripcion: string) => {
      const registro: RegistroApi = {
        id: api.nuevoId(),
        caminanteId,
        puestoId,
        tipo,
        hora: new Date().toISOString(),
        cargadoPor: cargadoPor || null,
      };
      enviar({ accion: "guardar", registro });
      avisar({ texto: descripcion, deshacer: () => enviar({ accion: "borrar", registro }) });
    },
    [puestoId, cargadoPor, enviar, avisar],
  );

  const editarHora = useCallback(
    (registro: RegistroApi, hhmm: string) => {
      const hora = horaEditada(new Date(registro.hora), hhmm).toISOString();
      enviar({ accion: "guardar", registro: { ...registro, hora, cargadoPor: cargadoPor || registro.cargadoPor } });
    },
    [cargadoPor, enviar],
  );

  const borrar = useCallback((registro: RegistroApi) => enviar({ accion: "borrar", registro }), [enviar]);

  const reintentar = useCallback(
    (clave: string) => {
      const c = cambios.get(clave);
      if (c) enviar(c.cambio);
    },
    [cambios, enviar],
  );

  const descartar = useCallback((clave: string) => {
    setCambios((m) => {
      const n = new Map(m);
      n.delete(clave);
      return n;
    });
  }, []);

  const filas = useMemo(() => {
    const locales = new Map([...cambios].map(([k, v]) => [k, v.cambio]));
    return combinar(datos.filas, locales);
  }, [datos.filas, cambios]);

  return {
    datos,
    filas,
    cambios,
    conexion,
    aviso,
    cerrarAviso: () => setAviso(null),
    refrescar,
    marcar,
    editarHora,
    borrar,
    reintentar,
    reintentarTodo,
    descartar,
  };
}
