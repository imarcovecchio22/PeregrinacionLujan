// Check-in en la parroquia antes de salir: cada punto de partida tiene su hora
// (`Puesto.horaCheckin`) y las partidas con la misma hora forman un turno
// (ej. 07:00 → Liniers; 14:00 → La Reja y Rodríguez). Todos hacen check-in, vayan
// en micro o por su cuenta.

import type { CaminanteDom, PuestoDom } from "./tipos";

export interface TurnoCheckin {
  /** "HH:mm", o null para las partidas sin hora cargada. */
  hora: string | null;
  /** Partidas del turno, en orden de recorrido. */
  puestos: PuestoDom[];
}

/** Turnos de check-in, por hora (las partidas sin hora van al final, en un turno aparte). */
export function turnosCheckin(puestos: PuestoDom[]): TurnoCheckin[] {
  const turnos = new Map<string | null, PuestoDom[]>();
  for (const p of [...puestos].sort((a, b) => a.orden - b.orden)) {
    if (!p.esPartidaPosible) continue;
    const hora = p.horaCheckin || null;
    turnos.set(hora, [...(turnos.get(hora) ?? []), p]);
  }
  return [...turnos]
    .map(([hora, ps]) => ({ hora, puestos: ps }))
    .sort((a, b) => (a.hora === null ? 1 : b.hora === null ? -1 : a.hora.localeCompare(b.hora)));
}

/** Hora del turno de check-in que le toca al caminante (la de su partida). */
export function turnoDe(c: Pick<CaminanteDom, "puntoPartidaId">, puestos: PuestoDom[]): string | null {
  return puestos.find((p) => p.id === c.puntoPartidaId)?.horaCheckin || null;
}

export function nombreTurno(t: TurnoCheckin): string {
  return `${t.hora ?? "Sin horario"} · ${t.puestos.map((p) => p.nombre).join(", ")}`;
}

/**
 * Turno que conviene mostrar a la hora `ahora` ("HH:mm"): el último que ya empezó (o empieza
 * dentro de 2 horas); antes del primero, el primero.
 */
export function turnoActual<T extends { hora: string | null }>(turnos: T[], ahora: string): T | undefined {
  const [h, m] = ahora.split(":").map(Number);
  const limite = h * 60 + m + 120;
  const conHora = turnos.filter((t) => t.hora !== null);
  const empezados = conHora.filter((t) => {
    const [th, tm] = t.hora!.split(":").map(Number);
    return th * 60 + tm <= limite;
  });
  return empezados.at(-1) ?? conHora[0] ?? turnos[0];
}
