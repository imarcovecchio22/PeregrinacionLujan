"use client";

// Sin login: cada celular recuerda en qué puesto está y quién carga.
// Es solo una comodidad del dispositivo (si se borra, se vuelve a elegir).

import { useSyncExternalStore } from "react";

export interface Dispositivo {
  puestoId: string | null;
  nombre: string;
}

const CLAVE = "lujan.dispositivo";
const EVENTO = "lujan-dispositivo";
const VACIO: Dispositivo = { puestoId: null, nombre: "" };

let cacheCrudo: string | null = null;
let cache: Dispositivo = VACIO;

function leer(): Dispositivo {
  let crudo: string | null = null;
  try {
    crudo = localStorage.getItem(CLAVE);
  } catch {
    return cache;
  }
  if (crudo !== cacheCrudo) {
    cacheCrudo = crudo;
    try {
      cache = crudo ? { ...VACIO, ...JSON.parse(crudo) } : VACIO;
    } catch {
      cache = VACIO;
    }
  }
  return cache;
}

export function guardarDispositivo(cambios: Partial<Dispositivo>) {
  const nuevo = { ...leer(), ...cambios };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(nuevo));
  } catch {
    cache = nuevo; // sin storage: al menos dura mientras la página esté abierta
  }
  window.dispatchEvent(new Event(EVENTO));
}

function suscribir(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENTO, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENTO, cb);
  };
}

/** `null` durante el render del servidor (todavía no se sabe qué hay en el celular). */
export function useDispositivo(): Dispositivo | null {
  return useSyncExternalStore<Dispositivo | null>(suscribir, leer, () => null);
}
