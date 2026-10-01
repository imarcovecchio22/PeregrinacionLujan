// Tipos que viajan entre el servidor y el navegador (fechas como ISO string).

import type { Tramo } from "@/domain/micros";
import type { CaminanteDom, PuestoDom, TipoRegistro } from "@/domain/tipos";

export interface RegistroApi {
  id: string;
  caminanteId: string;
  puestoId: string;
  tipo: TipoRegistro;
  /** ISO 8601 */
  hora: string;
  cargadoPor: string | null;
}

export interface CaminanteApi extends CaminanteDom {
  numero: number;
  nombreCompleto: string;
  telefonos: string[];
  dni: string | null;
  notas: string | null;
}

export interface FilaPuesto {
  caminante: CaminanteApi;
  /** Registros de este caminante en este puesto. */
  registros: RegistroApi[];
  /** ISO: hora del check-in en la parroquia, o null si no lo hizo (sin check-in no se marca nada). */
  checkin: string | null;
}

export interface OtroCaminante {
  id: string;
  numero: number;
  nombreCompleto: string;
  dni: string | null;
  telefonos: string[];
  partida: string;
}

export interface DatosPuesto {
  puesto: PuestoDom;
  puestos: PuestoDom[];
  filas: FilaPuesto[];
  /** Caminantes que NO están en la lista de este puesto (para avisar al buscar). */
  otros: OtroCaminante[];
  /** ISO: cuándo se generaron los datos en el servidor. */
  generado: string;
}

export interface RespuestaGuardar {
  registro: RegistroApi;
  /** Ya había un registro de otra persona para el mismo caminante/puesto/tipo: se conserva ese. */
  yaExistia: boolean;
}

export interface AbordajeApi {
  id: string;
  caminanteId: string;
  tramo: Tramo;
  /** ISO 8601 */
  hora: string;
  cargadoPor: string | null;
}

export interface FilaMicro {
  caminante: CaminanteApi;
  partida: string;
  /** Anotado para este micro. */
  esperado: boolean;
  /** Si no está anotado, por qué (ej. "vuelve por su cuenta"). */
  motivo: string | null;
  abordaje: AbordajeApi | null;
}

export interface DatosMicro {
  tramo: Tramo;
  peregrinacionId: string;
  filas: FilaMicro[];
  generado: string;
}

export interface RespuestaAbordaje {
  abordaje: AbordajeApi;
  yaExistia: boolean;
}
