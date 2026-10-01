import { describe, expect, it } from "vitest";
import { generarCaminantesFicticios } from "../../prisma/datos-ficticios";
import { nombreTurno, turnoActual, turnoDe, turnosCheckin } from "./checkin";
import { esperadoEnMicro } from "./micros";
import { PUESTOS_DEFAULT } from "./puestos-default";
import type { PuestoDom } from "./tipos";

const puestos: PuestoDom[] = PUESTOS_DEFAULT.map((p) => ({ ...p, id: p.nombre }));
const caminantes = generarCaminantesFicticios().map((c) => ({ id: String(c.numero), puntoPartidaId: c.partida }));

describe("turnos de check-in", () => {
  it("agrupa las partidas por hora: 07:00 Liniers, 14:00 La Reja y Rodríguez", () => {
    const turnos = turnosCheckin(puestos);
    expect(turnos.map(nombreTurno)).toEqual(["07:00 · Liniers", "14:00 · La Reja, Rodríguez"]);
  });

  it("reparte a todos según su partida (102 a la mañana, 59 a la tarde)", () => {
    const cuenta = (h: string) => caminantes.filter((c) => turnoDe(c, puestos) === h).length;
    expect(cuenta("07:00")).toBe(102);
    expect(cuenta("14:00")).toBe(59);
  });

  it("todos se esperan en el check-in, vayan en micro o por su cuenta", () => {
    expect(
      caminantes.every((c) =>
        esperadoEnMicro({ ...c, abandonoTrasPuestoId: null, transporteIda: "POR_SU_CUENTA", transporteVuelta: null }, "CHECKIN", puestos),
      ),
    ).toBe(true);
  });

  it("las partidas sin hora van a un turno aparte, al final", () => {
    const sinHora = puestos.map((p) => (p.nombre === "Rodríguez" ? { ...p, horaCheckin: null } : p));
    expect(turnosCheckin(sinHora).map(nombreTurno)).toEqual(["07:00 · Liniers", "14:00 · La Reja", "Sin horario · Rodríguez"]);
  });

  it("muestra el turno que corresponde según la hora", () => {
    const turnos = turnosCheckin(puestos);
    expect(turnoActual(turnos, "05:30")?.hora).toBe("07:00");
    expect(turnoActual(turnos, "10:00")?.hora).toBe("07:00");
    expect(turnoActual(turnos, "12:30")?.hora).toBe("14:00");
    expect(turnoActual(turnos, "23:00")?.hora).toBe("14:00");
  });
});
