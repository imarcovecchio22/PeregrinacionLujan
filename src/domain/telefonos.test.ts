import { describe, expect, it } from "vitest";
import { esTelefonoAmba, separarTelefonos } from "./telefonos";

describe("separarTelefonos", () => {
  it("separa por / y saltos de línea, sin tocar el formato", () => {
    expect(separarTelefonos("1144445555/ 1166667777")).toEqual(["1144445555", "1166667777"]);
    expect(separarTelefonos("11 4444-5555\n0221 15 555-0101")).toEqual(["11 4444-5555", "0221 15 555-0101"]);
    expect(separarTelefonos("  ")).toEqual([]);
    expect(separarTelefonos(null)).toEqual([]);
  });
});

describe("esTelefonoAmba", () => {
  it.each([
    ["11 4444-5555", true],
    ["1144445555", true],
    ["+54 9 11 4444-5555", true],
    ["011 15 4444-5555", true],
    ["0221 15 555-0101", false],
    ["3415550102", false],
    ["+54 9 351 555-0103", false],
    ["4444-5555", false],
  ])("%s → %s", (tel, esperado) => {
    expect(esTelefonoAmba(tel)).toBe(esperado);
  });
});
