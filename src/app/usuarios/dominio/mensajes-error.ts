import { CODIGOS_ERROR, ErrorApi, ErrorSinConexion } from '../../compartido/dominio/error-api';
import { ErrorSesionExpirada } from './errores';

/** Dónde ocurrió el error: cambia el mensaje de «sin conexión». */
export type ContextoError = 'ingreso' | 'registro' | 'aviso' | 'general';

export const MENSAJES_ERROR = {
  credencialesInvalidas: 'Correo o clave incorrectos.',
  correoYaRegistrado: 'Ya existe una cuenta con ese correo. Inicie sesión o use otro correo.',
  privacidadNoAceptada: 'Debe aceptar el aviso de privacidad para crear su cuenta.',
  privacidadDesactualizada:
    'El aviso de privacidad cambió. Léalo de nuevo y acéptelo para continuar.',
  demasiadasSolicitudes: 'Demasiados intentos. Espere un momento e inténtelo de nuevo.',
  datosInvalidos: 'Revise los datos del formulario.',
  noAutorizado: 'No tiene permiso para esta acción.',
  noEncontrado: 'No encontrado.',
  sesionExpirada: 'Su sesión terminó. Vuelva a iniciar sesión.',
  primerIngresoSinConexion: 'Necesitas conexión para iniciar sesión por primera vez.',
  registroSinConexion: 'Necesitas conexión para crear tu cuenta.',
  avisoSinConexion:
    'No se pudo cargar el aviso de privacidad. Revisa tu conexión e inténtalo de nuevo.',
  sinConexion: 'No hay conexión con el servidor. Inténtalo de nuevo.',
  inesperado: 'No se pudo completar la operación. Inténtalo de nuevo.',
} as const;

/**
 * Traduce un error a un mensaje en español, sin detalles técnicos, para mostrarlo al
 * Cliente (contrato de usuarios, «Comportamiento esperado de las apps»).
 */
export function mensajeDeError(error: unknown, contexto: ContextoError = 'general'): string {
  if (error instanceof ErrorSinConexion) {
    switch (contexto) {
      case 'ingreso':
        return MENSAJES_ERROR.primerIngresoSinConexion;
      case 'registro':
        return MENSAJES_ERROR.registroSinConexion;
      case 'aviso':
        return MENSAJES_ERROR.avisoSinConexion;
      default:
        return MENSAJES_ERROR.sinConexion;
    }
  }
  if (error instanceof ErrorSesionExpirada) return MENSAJES_ERROR.sesionExpirada;
  if (!(error instanceof ErrorApi)) return MENSAJES_ERROR.inesperado;

  switch (error.codigo) {
    // D-19: mismo mensaje para clave incorrecta, correo inexistente o rol no permitido.
    case CODIGOS_ERROR.credencialesInvalidas:
      return MENSAJES_ERROR.credencialesInvalidas;
    case CODIGOS_ERROR.correoYaRegistrado:
      return MENSAJES_ERROR.correoYaRegistrado;
    case CODIGOS_ERROR.privacidadNoAceptada:
      return MENSAJES_ERROR.privacidadNoAceptada;
    case CODIGOS_ERROR.privacidadDesactualizada:
      return MENSAJES_ERROR.privacidadDesactualizada;
    case CODIGOS_ERROR.demasiadasSolicitudes: {
      const segundos = error.reintentarEnSegundos;
      return segundos === null
        ? MENSAJES_ERROR.demasiadasSolicitudes
        : `${MENSAJES_ERROR.demasiadasSolicitudes} (${segundos} s)`;
    }
    case CODIGOS_ERROR.datosInvalidos:
      return MENSAJES_ERROR.datosInvalidos;
    case CODIGOS_ERROR.tokenInvalido:
    case CODIGOS_ERROR.noAutenticado:
    case CODIGOS_ERROR.tokenVencido:
      return MENSAJES_ERROR.sesionExpirada;
    case CODIGOS_ERROR.noAutorizado:
      return MENSAJES_ERROR.noAutorizado;
    case CODIGOS_ERROR.noEncontrado:
      return MENSAJES_ERROR.noEncontrado;
    default:
      return MENSAJES_ERROR.inesperado;
  }
}
