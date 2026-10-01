// Puestos con los que se crea una peregrinación nueva. Son editables desde la app:
// nada del dominio depende de estos nombres, solo del orden y de los flags.

export const PUESTOS_DEFAULT = [
  { orden: 0, nombre: "Liniers", esPartidaPosible: true, registraIngreso: false, registraSalida: true, horaCheckin: "07:00" },
  { orden: 1, nombre: "Castelar", esPartidaPosible: false, registraIngreso: true, registraSalida: true, horaCheckin: null },
  { orden: 2, nombre: "Merlo", esPartidaPosible: false, registraIngreso: true, registraSalida: true, horaCheckin: null },
  { orden: 3, nombre: "La Reja", esPartidaPosible: true, registraIngreso: true, registraSalida: true, horaCheckin: "14:00" },
  { orden: 4, nombre: "Rodríguez", esPartidaPosible: true, registraIngreso: true, registraSalida: true, horaCheckin: "14:00" },
  { orden: 5, nombre: "Luján", esPartidaPosible: false, registraIngreso: true, registraSalida: false, horaCheckin: null },
] as const;
