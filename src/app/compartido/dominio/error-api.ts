/**
 * Errores al hablar con la API, comunes a todos los módulos (contrato, README: formato
 * `{ codigo, mensaje, detalles }`). TypeScript puro (RNF-14).
 */

export interface ErrorDeCampo {
  readonly campo: string;
  readonly errores: readonly string[];
}

/** Error con el formato del contrato devuelto por la API. */
export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
    readonly detalles: Readonly<Record<string, unknown>> = {},
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }

  /** Errores por campo de un 400 `DATOS_INVALIDOS` (`detalles.errores`). */
  get erroresDeCampo(): readonly ErrorDeCampo[] {
    const errores = this.detalles['errores'];
    if (!Array.isArray(errores)) return [];
    return errores.filter(
      (e): e is ErrorDeCampo =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as Record<string, unknown>)['campo'] === 'string' &&
        Array.isArray((e as Record<string, unknown>)['errores']),
    );
  }

  /** Segundos de espera de un 429 `DEMASIADAS_SOLICITUDES` (D-17). */
  get reintentarEnSegundos(): number | null {
    const segundos = this.detalles['reintentarEnSegundos'];
    return typeof segundos === 'number' && segundos > 0 ? Math.ceil(segundos) : null;
  }
}

/** No hubo respuesta del servidor: sin conexión o servidor inalcanzable. */
export class ErrorSinConexion extends Error {
  constructor(mensaje = 'Sin conexión con el servidor.') {
    super(mensaje);
    this.name = 'ErrorSinConexion';
  }
}

/** Códigos genéricos y de autenticación del contrato (README, usuarios.md y recuperacion-clave.md). */
export const CODIGOS_ERROR = {
  datosInvalidos: 'DATOS_INVALIDOS',
  credencialesInvalidas: 'CREDENCIALES_INVALIDAS',
  correoYaRegistrado: 'CORREO_YA_REGISTRADO',
  privacidadNoAceptada: 'PRIVACIDAD_NO_ACEPTADA',
  privacidadDesactualizada: 'PRIVACIDAD_DESACTUALIZADA',
  demasiadasSolicitudes: 'DEMASIADAS_SOLICITUDES',
  noAutenticado: 'NO_AUTENTICADO',
  tokenVencido: 'TOKEN_VENCIDO',
  tokenInvalido: 'TOKEN_INVALIDO',
  noAutorizado: 'NO_AUTORIZADO',
  noEncontrado: 'NO_ENCONTRADO',
  // recuperacion-clave.md (RF-USU-05).
  codigoInvalido: 'CODIGO_INVALIDO',
  claveActualIncorrecta: 'CLAVE_ACTUAL_INCORRECTA',
  errorInterno: 'ERROR_INTERNO',
} as const;
