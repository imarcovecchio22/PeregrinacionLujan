import { describe, expect, it } from "vitest";
import { parsearCsv } from "./csv";

describe("parsearCsv", () => {
  it("separador ; con comillas y saltos de línea", () => {
    expect(parsearCsv('N°;Apellido y nombre;Teléfono\r\n1;"Pérez; Ana";"11 1111-2222/\n11 3333-4444"\r\n2;"Dice ""hola""";\r\n')).toEqual([
      ["N°", "Apellido y nombre", "Teléfono"],
      ["1", "Pérez; Ana", "11 1111-2222/\n11 3333-4444"],
      ["2", 'Dice "hola"', ""],
    ]);
  });

  it("separador , y BOM", () => {
    expect(parsearCsv("﻿a,b\n21:30,NA")).toEqual([
      ["a", "b"],
      ["21:30", "NA"],
    ]);
  });
});
