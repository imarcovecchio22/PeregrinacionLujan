import { describe, expect, it } from "vitest";
import { conHora, formatHora, horaEditada } from "./hora";

const ar = (s: string) => new Date(`${s}-03:00`);

describe("horas en zona argentina", () => {
  it("formatea en hora argentina aunque el proceso corra en UTC", () => {
    expect(formatHora(new Date("2026-10-04T02:15:00Z"))).toBe("23:15");
  });

  it("conHora usa la fecha argentina de la base", () => {
    // 01:30 UTC del 4 = 22:30 del 3 en Argentina
    expect(conHora(new Date("2026-10-04T01:30:00Z"), "07:05")).toEqual(ar("2026-10-03T07:05:00"));
  });

  it("rechaza horas inválidas", () => {
    expect(() => conHora(new Date(), "25:00")).toThrow();
    expect(() => conHora(new Date(), "abc")).toThrow();
  });
});

describe("horaEditada (la caminata cruza la medianoche)", () => {
  it("ajuste chico en el mismo día", () => {
    const anterior = ar("2026-10-03T21:40:00");
    expect(horaEditada(anterior, "21:30", ar("2026-10-03T21:45:00"))).toEqual(ar("2026-10-03T21:30:00"));
  });

  it("registrado 00:10, corregido a 23:55 → día anterior", () => {
    const anterior = ar("2026-10-04T00:10:00");
    expect(horaEditada(anterior, "23:55", ar("2026-10-04T00:15:00"))).toEqual(ar("2026-10-03T23:55:00"));
  });

  it("registrado 23:50, corregido a 00:05 → día siguiente si ya pasó", () => {
    const anterior = ar("2026-10-03T23:50:00");
    expect(horaEditada(anterior, "00:05", ar("2026-10-04T00:20:00"))).toEqual(ar("2026-10-04T00:05:00"));
  });

  it("no deja una hora en el futuro", () => {
    const anterior = ar("2026-10-03T23:50:00");
    expect(horaEditada(anterior, "00:05", ar("2026-10-03T23:55:00"))).toEqual(ar("2026-10-03T00:05:00"));
  });
});
