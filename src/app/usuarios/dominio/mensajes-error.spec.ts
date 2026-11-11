import { ErrorApi, ErrorSinConexion } from '../../compartido/dominio/error-api';
import { ErrorSesionExpirada } from './errores';
import { mensajeDeError, MENSAJES_ERROR } from './mensajes-error';

describe('Mensajes de error en español (contrato de usuarios)', () => {
  it('CA-01 / D-19: credenciales inválidas → «Correo o clave incorrectos.»', () => {
    const error = new ErrorApi(401, 'CREDENCIALES_INVALIDAS', 'Correo o clave incorrectos.');
    expect(mensajeDeError(error, 'ingreso')).toBe('Correo o clave incorrectos.');
  });

  it('PLAN 1.6: sin conexión al ingresar → «Necesitas conexión para iniciar sesión por primera vez.»', () => {
    expect(mensajeDeError(new ErrorSinConexion(), 'ingreso')).toBe(
      'Necesitas conexión para iniciar sesión por primera vez.',
    );
  });

  it('distingue el registro y el aviso sin conexión', () => {
    expect(mensajeDeError(new ErrorSinConexion(), 'registro')).toBe(MENSAJES_ERROR.registroSinConexion);
    expect(mensajeDeError(new ErrorSinConexion(), 'aviso')).toBe(MENSAJES_ERROR.avisoSinConexion);
    expect(mensajeDeError(new ErrorSinConexion())).toBe(MENSAJES_ERROR.sinConexion);
  });

  it.each([
    ['CORREO_YA_REGISTRADO', 409, MENSAJES_ERROR.correoYaRegistrado],
    ['PRIVACIDAD_NO_ACEPTADA', 422, MENSAJES_ERROR.privacidadNoAceptada],
    ['PRIVACIDAD_DESACTUALIZADA', 422, MENSAJES_ERROR.privacidadDesactualizada],
    ['DATOS_INVALIDOS', 400, MENSAJES_ERROR.datosInvalidos],
    ['TOKEN_INVALIDO', 401, MENSAJES_ERROR.sesionExpirada],
    ['NO_AUTORIZADO', 403, 'No tiene permiso para esta acción.'],
    ['ERROR_INTERNO', 500, MENSAJES_ERROR.inesperado],
  ])('%s → mensaje del contrato', (codigo, estado, esperado) => {
    expect(mensajeDeError(new ErrorApi(estado, codigo, 'x'))).toBe(esperado);
  });

  it('D-17: 429 incluye los segundos de espera cuando llegan', () => {
    const conEspera = new ErrorApi(429, 'DEMASIADAS_SOLICITUDES', 'x', { reintentarEnSegundos: 42 });
    expect(mensajeDeError(conEspera)).toBe(
      'Demasiados intentos. Espere un momento e inténtelo de nuevo. (42 s)',
    );
    expect(mensajeDeError(new ErrorApi(429, 'DEMASIADAS_SOLICITUDES', 'x'))).toBe(
      MENSAJES_ERROR.demasiadasSolicitudes,
    );
  });

  it('una sesión expirada o un error desconocido no muestran detalles técnicos', () => {
    expect(mensajeDeError(new ErrorSesionExpirada())).toBe(MENSAJES_ERROR.sesionExpirada);
    expect(mensajeDeError(new TypeError('x is undefined'))).toBe(MENSAJES_ERROR.inesperado);
  });

  it('lee los errores por campo de DATOS_INVALIDOS', () => {
    const error = new ErrorApi(400, 'DATOS_INVALIDOS', 'x', {
      errores: [{ campo: 'telefono', errores: ['Ingrese un celular de Ecuador válido.'] }, { campo: 1 }],
    });
    expect(error.erroresDeCampo).toEqual([
      { campo: 'telefono', errores: ['Ingrese un celular de Ecuador válido.'] },
    ]);
  });
});

describe('Mensajes de recuperación y cambio de clave (RF-USU-05)', () => {
  it('422 CODIGO_INVALIDO → mensaje único del contrato, sin revelar el motivo', () => {
    expect(mensajeDeError(new ErrorApi(422, 'CODIGO_INVALIDO', 'x'), 'clave')).toBe(
      'El código no es válido o ya venció. Pide uno nuevo a tu vendedor.',
    );
  });

  it('422 CLAVE_ACTUAL_INCORRECTA → «La clave actual no es correcta.»', () => {
    expect(mensajeDeError(new ErrorApi(422, 'CLAVE_ACTUAL_INCORRECTA', 'x'), 'clave')).toBe(
      'La clave actual no es correcta.',
    );
  });

  it('sin conexión → «Necesitas conexión para cambiar tu clave.»', () => {
    expect(mensajeDeError(new ErrorSinConexion(), 'clave')).toBe(
      'Necesitas conexión para cambiar tu clave.',
    );
  });
});