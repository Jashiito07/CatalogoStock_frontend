import { ErrorApi, ErrorSinConexion } from '../../compartido/dominio/error-api';
import { ErrorSesionExpirada } from './errores';
import { mensajeCodigoIncorrecto, mensajeDeError, MENSAJES_ERROR } from './mensajes-error';

describe('Mensajes de error en español (contrato de usuarios)', () => {
  it('CA-01 / D-19: credenciales inválidas → «Correo o clave incorrectos.»', () => {
    const error = new ErrorApi(401, 'CREDENCIALES_INVALIDAS', 'Correo o clave incorrectos.');
    expect(mensajeDeError(error, 'ingreso')).toBe('Correo o clave incorrectos.');
  });

  it('D-52: 401 CORREO_NO_REGISTRADO → «No existe una cuenta registrada con ese correo.»', () => {
    const error = new ErrorApi(401, 'CORREO_NO_REGISTRADO', 'x');
    expect(mensajeDeError(error, 'ingreso')).toBe('No existe una cuenta registrada con ese correo.');
  });

  it('D-52: 403 CUENTA_DESACTIVADA → «Tu cuenta está desactivada. Contacta a tu vendedor.»', () => {
    const error = new ErrorApi(403, 'CUENTA_DESACTIVADA', 'x');
    expect(mensajeDeError(error, 'ingreso')).toBe(
      'Tu cuenta está desactivada. Contacta a tu vendedor.',
    );
  });

  it('D-52: CREDENCIALES_INVALIDAS conserva «Correo o clave incorrectos.» y no revela más', () => {
    expect(MENSAJES_ERROR.credencialesInvalidas).toBe('Correo o clave incorrectos.');
    expect(MENSAJES_ERROR.credencialesInvalidas).not.toContain('cuenta');
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
describe('Mensajes de verificación y recuperación por correo (correo.md, RF-USU-05)', () => {
  it('503 CORREO_NO_DISPONIBLE → «No pudimos enviar el correo, intenta de nuevo.»', () => {
    const error = new ErrorApi(503, 'CORREO_NO_DISPONIBLE', 'x');
    expect(mensajeDeError(error, 'verificacion')).toBe('No pudimos enviar el correo, intenta de nuevo.');
    expect(mensajeDeError(new ErrorApi(503, 'ERROR_INTERNO', 'x'), 'verificacion')).toBe(
      MENSAJES_ERROR.correoNoDisponible,
    );
  });

  it('422 por correo no menciona al vendedor; el de la recuperación asistida sí', () => {
    const error = new ErrorApi(422, 'CODIGO_INVALIDO', 'x');
    expect(mensajeDeError(error, 'verificacion')).toBe(
      'El código no es válido o ya venció. Pide uno nuevo.',
    );
    expect(mensajeDeError(error, 'recuperacionCorreo')).not.toContain('vendedor');
    expect(mensajeDeError(error, 'clave')).toContain('vendedor');
  });

  it('429 incluye la espera; 409 explica que ya está verificado', () => {
    expect(
      mensajeDeError(new ErrorApi(429, 'DEMASIADAS_SOLICITUDES', 'x', { reintentarEnSegundos: 30 }), 'verificacion'),
    ).toContain('(30 s)');
    expect(mensajeDeError(new ErrorApi(409, 'CORREO_YA_VERIFICADO', 'x'), 'verificacion')).toBe(
      'Tu correo ya está verificado.',
    );
  });

  it('sin conexión: mensajes por contexto', () => {
    expect(mensajeDeError(new ErrorSinConexion(), 'verificacion')).toBe(
      'Necesitas conexión para verificar tu correo.',
    );
    expect(mensajeDeError(new ErrorSinConexion(), 'recuperacionCorreo')).toBe(
      MENSAJES_ERROR.claveSinConexion,
    );
  });

  it('mensajeCodigoIncorrecto cuenta los intentos hasta 5', () => {
    expect(mensajeCodigoIncorrecto(1)).toContain('Intento 1 de 5.');
    expect(mensajeCodigoIncorrecto(4)).toContain('Intento 4 de 5.');
    expect(mensajeCodigoIncorrecto(5)).toContain('Agotaste los 5 intentos');
  });
});