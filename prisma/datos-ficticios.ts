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
