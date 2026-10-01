// Tipos que viajan entre el servidor y el navegador (fechas como ISO string).

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
  notas: string | null;
}

export interface FilaPuesto {
  caminante: CaminanteApi;
  /** Registros de este caminante en este puesto. */
  registros: RegistroApi[];
}

export interface DatosPuesto {
  puesto: PuestoDom;
  puestos: PuestoDom[];
  filas: FilaPuesto[];
  /** ISO: cuándo se generaron los datos en el servidor. */
  generado: string;
}

export interface RespuestaGuardar {
  registro: RegistroApi;
  /** Ya había un registro de otra persona para el mismo caminante/puesto/tipo: se conserva ese. */
  yaExistia: boolean;
}
