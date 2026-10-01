// Tipos mínimos que usa la lógica de dominio. Son subconjuntos de los modelos de
// Prisma para que las funciones sean puras y se puedan testear sin base de datos.

export type TipoRegistro = "INGRESO" | "SALIDA";
export type Transporte = "MICRO" | "POR_SU_CUENTA";

export interface PuestoDom {
  id: string;
  orden: number;
  nombre: string;
  esPartidaPosible: boolean;
  registraIngreso: boolean;
  registraSalida: boolean;
}

export interface CaminanteDom {
  id: string;
  puntoPartidaId: string;
  abandonoTrasPuestoId: string | null;
  transporteIda: Transporte | null;
  transporteVuelta: Transporte | null;
}

export interface RegistroDom {
  caminanteId: string;
  puestoId: string;
  tipo: TipoRegistro;
  hora: Date;
}
