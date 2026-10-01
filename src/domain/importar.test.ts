import { describe, expect, it } from "vitest";
import { asignarFechas, hora, inferirPartida, leerListado, nombresParecidos, type Celda } from "./importar";
import { PUESTOS_DEFAULT } from "./puestos-default";
import type { PuestoDom } from "./tipos";

const puestos: PuestoDom[] = PUESTOS_DEFAULT.map((p) => ({ ...p, id: p.nombre }));

// Matriz con el mismo formato que la hoja "Listado" real (datos ficticios).
const ENCABEZADO: Celda[][] = [
  ["Completar hora de ingreso y salida en las celdas amarillas "],
  ["NA = la persona no pasa por ese puesto porque sale más adelante. "],
  [],
  ["N°", "Apellido y nombre", "DNI", "Teléfono", "Sale desde", "Ida a Liniers", "1. Castelar", "1. Castelar", "2. Merlo", "2. Merlo", "3. La Reja", "3. La Reja", "4. Rodríguez", "4. Rodríguez", "5. Luján", "Vuelta desde Luján"],
  ["N°", "Apellido y nombre", "DNI", "Teléfono", "Sale desde", "Ida a Liniers", "Ingreso", "Salida", "Ingreso", "Salida", "Ingreso", "Salida", "Ingreso", "Salida", "Ingreso", null],
];
const _ = null;
const fila = (...celdas: Celda[]) => celdas;

describe("leerListado", () => {
  const matriz: Celda[][] = [
    ...ENCABEZADO,
    fila(1, "Ficticio Ana", _, "11 4444-5555", "Liniers", "Micro", _, _, _, _, _, _, _, _, _, "Micro"),
    fila(2, "Bruno Ejemplo", _, "1166667777/ 1188889999", "Liniers", "Por su cuenta", _, _, _, _, _, _, _, _, _, "Por su cuenta"),
    fila(3, "Prueba Carla", _, "0221 15 555-0101", "La Reja", "NA", "NA", "NA", "NA", "NA", "NA", _, _, _, _, "Micro"),
    fila(4, "Demo Diego", _, "11 2222-3333", "Rodríguez", "NA", "NA", "NA", "NA", "NA", "NA", "NA", "NA", _, _, "Micro"),
    fila(5, "Ejemplo Bruno", _, "1166667777", "Liniers", "Micro", _, _, _, _, _, _, _, _, _, "Micro"),
    fila(6, "Muestra Elena", _, "11 2222-3333", "Rodríguez", "NA", "NA", "NA", "NA", "NA", "NA", "NA", "NA", _, _, "Micro"),
    [],
  ];
  const r = leerListado(matriz, puestos);

  it("lee todas las filas sin errores", () => {
    expect(r.errores).toEqual([]);
    expect(r.filas.map((f) => [f.numero, f.puntoPartidaId])).toEqual([
      [1, "Liniers"],
      [2, "Liniers"],
      [3, "La Reja"],
      [4, "Rodríguez"],
      [5, "Liniers"],
      [6, "Rodríguez"],
    ]);
  });

  it("no toca el nombre y separa teléfonos por /", () => {
    expect(r.filas[1].nombreCompleto).toBe("Bruno Ejemplo");
    expect(r.filas[1].telefonos).toEqual(["1166667777", "1188889999"]);
  });

  it("transporte: ida solo para Liniers", () => {
    expect(r.filas.map((f) => [f.transporteIda, f.transporteVuelta])).toEqual([
      ["MICRO", "MICRO"],
      ["POR_SU_CUENTA", "POR_SU_CUENTA"],
      [null, "MICRO"],
      [null, "MICRO"],
      ["MICRO", "MICRO"],
      [null, "MICRO"],
    ]);
  });

  it("advertencias no bloqueantes", () => {
    const porTipo = (t: string) => r.avisos.filter((a) => a.tipo === t).map((a) => a.filas);
    // "Bruno Ejemplo" y "Ejemplo Bruno": mismas palabras + mismo teléfono
    expect(porTipo("DUPLICADO")).toEqual([[7, 10]]);
    expect(porTipo("TELEFONO_COMPARTIDO")).toEqual([[9, 11]]);
    expect(porTipo("VARIOS_TELEFONOS")).toEqual([[7]]);
    expect(porTipo("NO_AMBA")).toEqual([[8]]);
  });

  it("infiere la partida por las NA si no hay columna Sale desde", () => {
    const sinColumna = matriz.map((f) => f.filter((_, c) => c !== 4));
    const s = leerListado(sinColumna, puestos);
    expect(s.errores).toEqual([]);
    expect(s.filas.map((f) => f.puntoPartidaId)).toEqual(["Liniers", "Liniers", "La Reja", "Rodríguez", "Liniers", "Rodríguez"]);
  });

  it("avisa si Sale desde no coincide con las NA", () => {
    const m = [...ENCABEZADO, fila(1, "Ficticio Ana", _, _, "La Reja", "NA", _, _, _, _, _, _, _, _, _, "Micro")];
    const s = leerListado(m, puestos);
    expect(s.filas[0].puntoPartidaId).toBe("La Reja");
    expect(s.avisos[0].mensaje).toContain("las NA corresponden a Liniers");
  });

  it("lee horas en distintos formatos y las asocia al puesto/tipo", () => {
    const m = [
      ...ENCABEZADO,
      fila(1, "Ficticio Ana", _, _, "Liniers", "Micro", 0.875, "21:40", new Date(Date.UTC(1899, 11, 30, 23, 5)), "23.30", _, _, _, _, _, "Micro"),
    ];
    expect(leerListado(m, puestos).filas[0].registros).toEqual([
      { puestoId: "Castelar", tipo: "INGRESO", hhmm: "21:00" },
      { puestoId: "Castelar", tipo: "SALIDA", hhmm: "21:40" },
      { puestoId: "Merlo", tipo: "INGRESO", hhmm: "23:05" },
      { puestoId: "Merlo", tipo: "SALIDA", hhmm: "23:30" },
    ]);
  });

  it("errores: número repetido, sin nombre, partida desconocida, sin encabezado", () => {
    const m = [
      ...ENCABEZADO,
      fila(1, "Ficticio Ana", _, _, "Liniers"),
      fila(1, "Otra Persona", _, _, "Liniers"),
      fila(2, _, _, _, "Liniers"),
      fila(3, "Demo Tres", _, _, "Moreno"),
      fila(4, "Demo Cuatro", _, _, "Liniers"),
    ];
    const s = leerListado(m, puestos);
    expect(s.filas.map((f) => f.numero)).toEqual([4]);
    expect(s.errores.map((e) => e.mensaje)).toEqual([
      "Fila 8: tiene número pero no nombre.",
      'Fila 9 (Demo Tres): "Sale desde" desconocido: "Moreno".',
      "El número 1 está repetido (filas 6, 7). Corregilo en la planilla.",
    ]);
    expect(leerListado([["hola"]], puestos).errores[0].mensaje).toContain("No se encontró el encabezado");
  });
});

describe("piezas", () => {
  it("hora()", () => {
    expect(hora("7:05")).toBe("07:05");
    expect(hora("21:30:00")).toBe("21:30");
    expect(hora(0.5)).toBe("12:00");
    expect(hora("mañana")).toBe("invalida");
    expect(hora("")).toBeNull();
  });

  it("nombresParecidos: mismas palabras en otro orden", () => {
    expect(nombresParecidos("Ejemplo Prueba Ana", "Ana Ejemplo Prueba")).toBe(true);
    expect(nombresParecidos("Pérez Ana", "Perez Ana María")).toBe(true);
    expect(nombresParecidos("Pérez Ana", "Pérez Juan")).toBe(false);
  });

  it("inferirPartida", () => {
    const cols = (nas: boolean[]) =>
      [
        ["Castelar", "INGRESO"],
        ["Castelar", "SALIDA"],
        ["Merlo", "INGRESO"],
        ["Merlo", "SALIDA"],
        ["La Reja", "INGRESO"],
        ["La Reja", "SALIDA"],
        ["Rodríguez", "INGRESO"],
        ["Rodríguez", "SALIDA"],
        ["Luján", "INGRESO"],
      ].map(([puestoId, tipo], i) => ({ puestoId, tipo: tipo as "INGRESO" | "SALIDA", esNA: nas[i] }));
    expect(inferirPartida(cols([false, false, false, false, false, false, false, false, false]), puestos)?.id).toBe("Liniers");
    expect(inferirPartida(cols([true, true, true, true, true, false, false, false, false]), puestos)?.id).toBe("La Reja");
    expect(inferirPartida(cols([true, true, true, true, true, true, true, false, false]), puestos)?.id).toBe("Rodríguez");
    expect(inferirPartida(cols([true, false, false, false, false, false, false, false, false]), puestos)).toBeNull();
  });
});

describe("asignarFechas (las horas de la planilla no tienen fecha)", () => {
  const ar = (s: string) => new Date(`${s}-03:00`);
  it("cruza la medianoche recorriendo el trayecto", () => {
    const r = asignarFechas(
      [
        { puestoId: "Merlo", tipo: "INGRESO", hhmm: "01:30" },
        { puestoId: "Castelar", tipo: "INGRESO", hhmm: "22:00" },
        { puestoId: "Castelar", tipo: "SALIDA", hhmm: "22:30" },
      ],
      puestos,
      "2026-10-03",
      "12:00",
    );
    expect(r.map((x) => x.hora)).toEqual([ar("2026-10-03T22:00:00"), ar("2026-10-03T22:30:00"), ar("2026-10-04T01:30:00")]);
  });

  it("si la primera hora es anterior al corte, es del día siguiente", () => {
    const r = asignarFechas([{ puestoId: "Rodríguez", tipo: "SALIDA", hhmm: "03:00" }], puestos, "2026-10-03", "12:00");
    expect(r[0].hora).toEqual(ar("2026-10-04T03:00:00"));
  });
});
