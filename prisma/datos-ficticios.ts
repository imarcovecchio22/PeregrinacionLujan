// Datos FICTICIOS con las mismas proporciones que la planilla real.
// El archivo real nunca va al repo: se importa desde la app.
//
// Proporciones: 161 personas; Liniers 102 (95 micro / 7 por su cuenta),
// La Reja 46, Rodríguez 13; vuelta 152 micro / 9 por su cuenta.
// Incluye a propósito los casos raros de la planilla: nombres en ambos órdenes,
// una persona con dos teléfonos, teléfonos compartidos y formatos no AMBA.

import type { Transporte } from "../src/domain/tipos";

export interface CaminanteFicticio {
  numero: number;
  nombreCompleto: string;
  telefonos: string[];
  /** Ficticio (con puntos, como se suele escribir); algunos sin DNI. */
  dni: string | null;
  partida: "Liniers" | "La Reja" | "Rodríguez";
  transporteIda: Transporte | null;
  transporteVuelta: Transporte;
}

const NOMBRES = [
  "Ana", "Bruno", "Camila", "Diego", "Elena", "Facundo", "Gabriela", "Hernán", "Inés", "Joaquín",
  "Julieta", "Lucas", "Martina", "Nicolás", "Olivia", "Pablo", "Rocío", "Santiago", "Tomás", "Valeria",
  "Agustina", "Benjamín", "Carolina", "Federico", "Florencia", "Ignacio", "Lucía", "Matías", "Paula", "Sofía",
];
const APELLIDOS = [
  "Ficticio", "Inventado", "Ejemplar", "Muestra", "Prueba", "Simulado", "Demo", "Ensayo", "Modelo",
  "Supuesto", "Imaginario", "Ilusorio", "Hipotético", "Figurado", "Teórico", "Probable", "Posible",
];

// PRNG determinístico (mulberry32) para que el seed sea reproducible.
function prng(semilla: number) {
  let a = semilla;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generarCaminantesFicticios(): CaminanteFicticio[] {
  const rnd = prng(2026);
  const elegir = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
  const telefono = () => {
    const n = () => String(Math.floor(rnd() * 10));
    return `11 ${Array.from({ length: 4 }, n).join("")}-${Array.from({ length: 4 }, n).join("")}`;
  };

  type Base = Pick<CaminanteFicticio, "partida" | "transporteIda">;
  const bases: Base[] = [
    ...Array.from({ length: 95 }, (): Base => ({ partida: "Liniers", transporteIda: "MICRO" })),
    ...Array.from({ length: 7 }, (): Base => ({ partida: "Liniers", transporteIda: "POR_SU_CUENTA" })),
    ...Array.from({ length: 46 }, (): Base => ({ partida: "La Reja", transporteIda: null })),
    ...Array.from({ length: 13 }, (): Base => ({ partida: "Rodríguez", transporteIda: null })),
  ];
  // Mezcla determinística (Fisher-Yates).
  for (let i = bases.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [bases[i], bases[j]] = [bases[j], bases[i]];
  }
  // 9 vuelven por su cuenta: elegidos en posiciones fijas repartidas.
  const vuelvenPorSuCuenta = new Set([4, 21, 38, 55, 72, 89, 106, 123, 140]);

  const caminantes = bases.map((b, i): CaminanteFicticio => {
    const nombre = elegir(NOMBRES);
    const apellido = `${elegir(APELLIDOS)}${rnd() < 0.2 ? ` ${elegir(APELLIDOS)}` : ""}`;
    // ~1 de cada 15 viene como "Nombre Apellido" en vez de "Apellido Nombre".
    const nombreCompleto = i % 15 === 7 ? `${nombre} ${apellido}` : `${apellido} ${nombre}`;
    return {
      numero: i + 1,
      nombreCompleto,
      telefonos: [telefono()],
      dni: i % 10 === 9 ? null : `${40 + (i % 9)}.${String(100 + i).padStart(3, "0")}.${String(Math.floor(rnd() * 1000)).padStart(3, "0")}`,
      ...b,
      transporteVuelta: vuelvenPorSuCuenta.has(i) ? "POR_SU_CUENTA" : "MICRO",
    };
  });

  // Casos raros de la planilla real:
  caminantes[10].telefonos.push(telefono()); // dos teléfonos
  caminantes[31].telefonos = [...caminantes[30].telefonos]; // teléfono compartido (familia)
  caminantes[61].telefonos = [...caminantes[60].telefonos]; // teléfono compartido (a confirmar)
  caminantes[80].telefonos = ["0221 15 555-0101"]; // no AMBA
  caminantes[81].telefonos = ["3415550102"]; // no AMBA
  caminantes[82].telefonos = ["+54 9 351 555-0103"]; // no AMBA
  return caminantes;
}

type Paso = { puesto: string; tipo: "INGRESO" | "SALIDA"; minutos: number };

/**
 * Simula la caminata "a mitad de camino" (para probar el tablero con `--demo`).
 * Horarios aproximados desde las 20:00 del sábado; cada caminante avanza hasta un punto
 * distinto. Incluye 2 abandonos y 1 inconsistencia (falta una Salida).
 */
export function simularRegistros(caminantes: { id: string; numero: number; partida: string }[]) {
  const recorridos: Record<string, Paso[]> = {
    Liniers: [
      { puesto: "Liniers", tipo: "SALIDA", minutos: 0 },
      { puesto: "Castelar", tipo: "INGRESO", minutos: 180 },
      { puesto: "Castelar", tipo: "SALIDA", minutos: 210 },
      { puesto: "Merlo", tipo: "INGRESO", minutos: 330 },
      { puesto: "Merlo", tipo: "SALIDA", minutos: 360 },
      { puesto: "La Reja", tipo: "INGRESO", minutos: 450 },
    ],
    "La Reja": [{ puesto: "La Reja", tipo: "SALIDA", minutos: 470 }],
    Rodríguez: [],
  };
  const inicio = new Date("2026-10-03T20:00:00-03:00").getTime();
  const registros: { caminanteId: string; puesto: string; tipo: "INGRESO" | "SALIDA"; hora: Date }[] = [];
  const abandonos: { caminanteId: string; puesto: string; hora: Date }[] = [];

  for (const c of caminantes) {
    const pasos = recorridos[c.partida] ?? [];
    // Cuántos pasos llegó a hacer: variado según el número.
    const hechos = c.partida === "Liniers" ? 2 + (c.numero % 5) : c.numero % 3 === 0 ? 1 : 0;
    pasos.slice(0, Math.min(hechos, pasos.length)).forEach((p) => {
      registros.push({
        caminanteId: c.id,
        puesto: p.puesto,
        tipo: p.tipo,
        hora: new Date(inicio + (p.minutos + (c.numero % 20)) * 60_000),
      });
    });
  }
  const liniers = caminantes.filter((c) => c.partida === "Liniers");
  // Inconsistencia: a uno que llegó a Merlo le falta la Salida de Castelar.
  const sinSalida = liniers.find((c) => c.numero % 5 >= 2);
  const i = registros.findIndex((r) => r.caminanteId === sinSalida?.id && r.puesto === "Castelar" && r.tipo === "SALIDA");
  if (i >= 0) registros.splice(i, 1);
  for (const [c, puesto] of [
    [liniers[3], "Castelar"],
    [liniers[10], "Liniers"],
  ] as const) {
    if (c) abandonos.push({ caminanteId: c.id, puesto, hora: new Date(inicio + 200 * 60_000) });
  }
  return { registros, abandonos };
}
