import { HttpErrorResponse } from '@angular/common/http';

import { ErrorApi, ErrorSinConexion } from '../dominio/error-api';

/** Códigos genéricos por estado (contrato, README) si la respuesta no trae `codigo`. */
const CODIGO_POR_ESTADO: Readonly<Record<number, string>> = {
  400: 'DATOS_INVALIDOS',
  401: 'NO_AUTENTICADO',
  403: 'NO_AUTORIZADO',
  404: 'NO_ENCONTRADO',
  409: 'CONFLICTO',
  413: 'ARCHIVO_DEMASIADO_GRANDE',
  415: 'TIPO_NO_ADMITIDO',
  422: 'REGLA_NEGOCIO',
  429: 'DEMASIADAS_SOLICITUDES',
};

interface CuerpoError {
  readonly codigo: string;
  readonly mensaje: string;
  readonly detalles?: Record<string, unknown>;
}

function esCuerpoError(valor: unknown): valor is CuerpoError {
  if (typeof valor !== 'object' || valor === null) return false;
  const cuerpo = valor as Record<string, unknown>;
  return typeof cuerpo['codigo'] === 'string' && typeof cuerpo['mensaje'] === 'string';
}

/** Lee el código del contrato de una respuesta de error HTTP, si lo trae. */
export function codigoDeErrorHttp(error: HttpErrorResponse): string | null {
  return esCuerpoError(error.error) ? error.error.codigo : null;
}

/**
 * Convierte un error de `HttpClient` en un error del dominio: `ErrorSinConexion` si no
 * hubo respuesta (estado 0) y `ErrorApi` con el formato del contrato en otro caso.
 */
export function convertirErrorHttp(error: unknown): Error {
  if (!(error instanceof HttpErrorResponse)) {
    return error instanceof Error ? error : new Error('Error inesperado.');
  }
  if (error.status === 0) return new ErrorSinConexion();
  if (esCuerpoError(error.error)) {
    const detalles =
      typeof error.error.detalles === 'object' && error.error.detalles !== null
        ? error.error.detalles
        : {};
    return new ErrorApi(error.status, error.error.codigo, error.error.mensaje, detalles);
  }
  return new ErrorApi(
    error.status,
    CODIGO_POR_ESTADO[error.status] ?? 'ERROR_INTERNO',
    'No se pudo completar la operación.',
  );
}
