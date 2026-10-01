// Llamadas a la API desde el navegador. Con señal irregular, todo tiene timeout y los
// errores dicen si vale la pena reintentar.

import type { AbordajeApi, DatosMicro, DatosPuesto, RegistroApi, RespuestaAbordaje, RespuestaGuardar } from "./tipos-api";

export class ErrorApi extends Error {
  constructor(
    message: string,
    /** true = problema de conexión o del servidor; false = el pedido en sí es inválido. */
    public reintentable: boolean,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 15_000;

async function pedir(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new ErrorApi("Sin conexión", true);
  }
  if (res.ok) return res;
  const cuerpo = await res.json().catch(() => null);
  const mensaje = cuerpo?.error ?? `Error ${res.status}`;
  // 401: venció el acceso. Se deja reintentable para no perder lo cargado: se vuelve a
  // ingresar el código (por ejemplo en otra pestaña) y se reintenta.
  throw new ErrorApi(mensaje, res.status >= 500 || res.status === 401 || res.status === 408 || res.status === 429);
}

export async function obtenerPuesto(puestoId: string): Promise<DatosPuesto> {
  return (await pedir(`/api/puestos/${puestoId}`)).json();
}

export async function guardarRegistro(r: RegistroApi): Promise<RespuestaGuardar> {
  const res = await pedir(`/api/registros/${r.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      caminanteId: r.caminanteId,
      puestoId: r.puestoId,
      tipo: r.tipo,
      hora: r.hora,
      cargadoPor: r.cargadoPor,
    }),
  });
  return res.json();
}

export async function borrarRegistro(id: string): Promise<void> {
  await pedir(`/api/registros/${id}`, { method: "DELETE" });
}

/** crypto.randomUUID solo existe en contextos seguros (https/localhost); en la red local por http no. */
export function nuevoId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export async function guardarAbandono(caminanteId: string, puestoId: string | null): Promise<void> {
  await pedir(`/api/caminantes/${caminanteId}/abandono`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ puestoId }),
  });
}

export async function obtenerMicro(tramo: "IDA" | "VUELTA"): Promise<DatosMicro> {
  return (await pedir(`/api/micros/${tramo.toLowerCase()}`)).json();
}

export async function guardarAbordaje(a: AbordajeApi): Promise<RespuestaAbordaje> {
  const res = await pedir(`/api/abordajes/${a.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caminanteId: a.caminanteId, tramo: a.tramo, hora: a.hora, cargadoPor: a.cargadoPor }),
  });
  return res.json();
}

export async function borrarAbordaje(id: string): Promise<void> {
  await pedir(`/api/abordajes/${id}`, { method: "DELETE" });
}
