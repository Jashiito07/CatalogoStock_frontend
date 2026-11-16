import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { URL_API } from '../../compartido/compartido.providers';
import { ErrorApi, ErrorSinConexion } from '../../compartido/dominio/error-api';
import { SESION_DE_PRUEBA } from '../pruebas/datos-de-prueba';
import { AVISO_DE_PRUEBA } from '../pruebas/dobles';
import { ApiUsuariosHttp, RUTAS_PUBLICAS } from './api-usuarios.http';

const URL = 'http://api.prueba/api/v1';

describe('ApiUsuariosHttp (docs/contrato-api/usuarios.md)', () => {
  let api: ApiUsuariosHttp;
  let controlador: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: URL_API, useValue: URL }],
    });
    api = TestBed.inject(ApiUsuariosHttp);
    controlador = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controlador.verify());

  it('POST /usuarios/registro con el cuerpo del contrato', async () => {
    const solicitud = {
      nombre: 'María Zambrano',
      correo: 'maria.zambrano@correo.com',
      telefono: '+593991234567',
      clave: 'Catalogo2026',
      aceptaPrivacidad: true as const,
      versionPrivacidad: '2026-11-1',
    };
    const promesa = api.registrar(solicitud);

    const peticion = controlador.expectOne(`${URL}/usuarios/registro`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(solicitud);
    peticion.flush(SESION_DE_PRUEBA.usuario, { status: 201, statusText: 'Creado' });

    expect(await promesa).toEqual(SESION_DE_PRUEBA.usuario);
  });

  it('D-19: el ingreso usa solo /autenticacion/ingreso/cliente', async () => {
    const promesa = api.ingresarCliente({ correo: 'maria@correo.com', clave: 'Catalogo2026' });

    const peticion = controlador.expectOne(`${URL}/autenticacion/ingreso/cliente`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ correo: 'maria@correo.com', clave: 'Catalogo2026' });
    peticion.flush(SESION_DE_PRUEBA);

    expect(await promesa).toEqual(SESION_DE_PRUEBA);
  });

  it('POST /autenticacion/renovacion y /autenticacion/salida envían el token de renovación', async () => {
    const renovacion = api.renovar('renovacion-1');
    const peticionRenovacion = controlador.expectOne(`${URL}/autenticacion/renovacion`);
    expect(peticionRenovacion.request.body).toEqual({ tokenRenovacion: 'renovacion-1' });
    peticionRenovacion.flush(SESION_DE_PRUEBA);
    await renovacion;

    const salida = api.salir('renovacion-1');
    const peticionSalida = controlador.expectOne(`${URL}/autenticacion/salida`);
    expect(peticionSalida.request.body).toEqual({ tokenRenovacion: 'renovacion-1' });
    peticionSalida.flush(null, { status: 204, statusText: 'Sin contenido' });
    await expect(salida).resolves.toBeUndefined();
  });

  it('GET /usuarios/yo y GET /privacidad/aviso', async () => {
    const yo = api.obtenerUsuarioActual();
    controlador.expectOne({ method: 'GET', url: `${URL}/usuarios/yo` }).flush(SESION_DE_PRUEBA.usuario);
    expect(await yo).toEqual(SESION_DE_PRUEBA.usuario);

    const aviso = api.obtenerAvisoPrivacidad();
    controlador.expectOne({ method: 'GET', url: `${URL}/privacidad/aviso` }).flush(AVISO_DE_PRUEBA);
    expect(await aviso).toEqual(AVISO_DE_PRUEBA);
  });

  it('convierte el error del contrato en ErrorApi con sus detalles', async () => {
    const promesa = api.registrar({
      nombre: 'x',
      correo: 'x',
      telefono: 'x',
      clave: 'x',
      aceptaPrivacidad: true,
      versionPrivacidad: 'x',
    });
    controlador.expectOne(`${URL}/usuarios/registro`).flush(
      {
        codigo: 'DATOS_INVALIDOS',
        mensaje: 'Datos inválidos.',
        detalles: { errores: [{ campo: 'telefono', errores: ['Ingrese un celular de Ecuador válido.'] }] },
      },
      { status: 400, statusText: 'Solicitud incorrecta' },
    );

    const error = await promesa.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as ErrorApi).codigo).toBe('DATOS_INVALIDOS');
    expect((error as ErrorApi).erroresDeCampo[0].campo).toBe('telefono');
  });

  it.each([
    [401, 'CORREO_NO_REGISTRADO'],
    [403, 'CUENTA_DESACTIVADA'],
  ])('D-52: el ingreso convierte %i %s en ErrorApi con el código del contrato', async (estado, codigo) => {
    const promesa = api.ingresarCliente({ correo: 'a@b.com', clave: 'x' });
    controlador
      .expectOne(`${URL}/autenticacion/ingreso/cliente`)
      .flush({ codigo, mensaje: 'x' }, { status: estado, statusText: 'Error' });

    const error = await promesa.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as ErrorApi).codigo).toBe(codigo);
    expect((error as ErrorApi).estado).toBe(estado);
  });

  it('sin respuesta del servidor lanza ErrorSinConexion', async () => {
    const promesa = api.ingresarCliente({ correo: 'a@b.com', clave: 'x' });
    controlador.expectOne(`${URL}/autenticacion/ingreso/cliente`).error(new ProgressEvent('error'), { status: 0 });

    await expect(promesa).rejects.toBeInstanceOf(ErrorSinConexion);
  });

  it('rechaza una sesión con forma inesperada', async () => {
    const promesa = api.ingresarCliente({ correo: 'a@b.com', clave: 'x' });
    controlador.expectOne(`${URL}/autenticacion/ingreso/cliente`).flush({ tokenAcceso: 'x' });

    await expect(promesa).rejects.toBeInstanceOf(ErrorApi);
  });
});

describe('ApiUsuariosHttp (docs/contrato-api/recuperacion-clave.md, RF-USU-05)', () => {
  let api: ApiUsuariosHttp;
  let controlador: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: URL_API, useValue: URL }],
    });
    api = TestBed.inject(ApiUsuariosHttp);
    controlador = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controlador.verify());

  it('POST /autenticacion/recuperacion con correo, código y clave nueva → 204', async () => {
    const solicitud = { correo: 'maria.zambrano@correo.com', codigo: '482913', claveNueva: 'NuevaClave2026' };
    const promesa = api.recuperarClave(solicitud);

    const peticion = controlador.expectOne(`${URL}/autenticacion/recuperacion`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(solicitud);
    peticion.flush(null, { status: 204, statusText: 'Sin contenido' });

    await expect(promesa).resolves.toBeUndefined();
  });

  it('422 CODIGO_INVALIDO y 429 llegan como ErrorApi con el código del contrato', async () => {
    const solicitud = { correo: 'maria@correo.com', codigo: '000000', claveNueva: 'NuevaClave2026' };
    const invalido = api.recuperarClave(solicitud);
    controlador.expectOne(`${URL}/autenticacion/recuperacion`).flush(
      {
        codigo: 'CODIGO_INVALIDO',
        mensaje: 'El código no es válido o ya venció. Pide uno nuevo a tu vendedor.',
        detalles: {},
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await expect(invalido).rejects.toMatchObject({ estado: 422, codigo: 'CODIGO_INVALIDO' });

    const limitado = api.recuperarClave(solicitud);
    controlador.expectOne(`${URL}/autenticacion/recuperacion`).flush(
      { codigo: 'DEMASIADAS_SOLICITUDES', mensaje: 'x', detalles: { reintentarEnSegundos: 30 } },
      { status: 429, statusText: 'Too Many Requests' },
    );
    const error = await limitado.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as ErrorApi).reintentarEnSegundos).toBe(30);
  });

  it('POST /usuarios/yo/clave con clave actual, nueva y tokenRenovacionActual → 204', async () => {
    const solicitud = {
      claveActual: 'Catalogo2026',
      claveNueva: 'NuevaClave2026',
      tokenRenovacionActual: 'renovacion-1',
    };
    const promesa = api.cambiarClave(solicitud);

    const peticion = controlador.expectOne(`${URL}/usuarios/yo/clave`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(solicitud);
    peticion.flush(null, { status: 204, statusText: 'Sin contenido' });

    await expect(promesa).resolves.toBeUndefined();
  });

  it('422 CLAVE_ACTUAL_INCORRECTA y sin conexión', async () => {
    const solicitud = { claveActual: 'Mala2026', claveNueva: 'NuevaClave2026' };
    const incorrecta = api.cambiarClave(solicitud);
    controlador.expectOne(`${URL}/usuarios/yo/clave`).flush(
      { codigo: 'CLAVE_ACTUAL_INCORRECTA', mensaje: 'La clave actual no es correcta.', detalles: {} },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await expect(incorrecta).rejects.toMatchObject({ codigo: 'CLAVE_ACTUAL_INCORRECTA' });

    const sinRed = api.cambiarClave(solicitud);
    controlador.expectOne(`${URL}/usuarios/yo/clave`).error(new ProgressEvent('error'), { status: 0 });
    await expect(sinRed).rejects.toBeInstanceOf(ErrorSinConexion);
  });
});
describe('ApiUsuariosHttp (docs/contrato-api/correo.md, RF-USU-05, D-50)', () => {
  let api: ApiUsuariosHttp;
  let controlador: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: URL_API, useValue: URL }],
    });
    api = TestBed.inject(ApiUsuariosHttp);
    controlador = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controlador.verify());

  it('POST /usuarios/yo/correo/verificacion sin datos → 204', async () => {
    const promesa = api.solicitarVerificacionCorreo();

    const peticion = controlador.expectOne(`${URL}/usuarios/yo/correo/verificacion`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({});
    peticion.flush(null, { status: 204, statusText: 'Sin contenido' });

    await expect(promesa).resolves.toBeUndefined();
  });

  it.each([
    [409, 'CORREO_YA_VERIFICADO'],
    [429, 'DEMASIADAS_SOLICITUDES'],
    [503, 'CORREO_NO_DISPONIBLE'],
  ])('verificación: %i %s llega como ErrorApi con el código del contrato', async (estado, codigo) => {
    const promesa = api.solicitarVerificacionCorreo();
    controlador
      .expectOne(`${URL}/usuarios/yo/correo/verificacion`)
      .flush({ codigo, mensaje: 'x', detalles: {} }, { status: estado, statusText: 'Error' });

    await expect(promesa).rejects.toMatchObject({ estado, codigo });
  });

  it('503 sin cuerpo también se reconoce como error de la API', async () => {
    const promesa = api.solicitarVerificacionCorreo();
    controlador
      .expectOne(`${URL}/usuarios/yo/correo/verificacion`)
      .flush(null, { status: 503, statusText: 'Service Unavailable' });

    const error = await promesa.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect((error as ErrorApi).estado).toBe(503);
  });

  it('POST /usuarios/yo/correo/confirmacion con { codigo } → 204', async () => {
    const promesa = api.confirmarVerificacionCorreo('482913');

    const peticion = controlador.expectOne(`${URL}/usuarios/yo/correo/confirmacion`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ codigo: '482913' });
    peticion.flush(null, { status: 204, statusText: 'Sin contenido' });

    await expect(promesa).resolves.toBeUndefined();
  });

  it('confirmación: 422 CODIGO_INVALIDO y 429 con reintentarEnSegundos', async () => {
    const invalido = api.confirmarVerificacionCorreo('000000');
    controlador
      .expectOne(`${URL}/usuarios/yo/correo/confirmacion`)
      .flush(
        { codigo: 'CODIGO_INVALIDO', mensaje: 'x', detalles: {} },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    await expect(invalido).rejects.toMatchObject({ estado: 422, codigo: 'CODIGO_INVALIDO' });

    const limitado = api.confirmarVerificacionCorreo('000000');
    controlador.expectOne(`${URL}/usuarios/yo/correo/confirmacion`).flush(
      { codigo: 'DEMASIADAS_SOLICITUDES', mensaje: 'x', detalles: { reintentarEnSegundos: 45 } },
      { status: 429, statusText: 'Too Many Requests' },
    );
    const error = await limitado.catch((e: unknown) => e);
    expect((error as ErrorApi).reintentarEnSegundos).toBe(45);
  });

  it('POST /autenticacion/recuperacion/solicitud con { correo } → 204, sin token (ruta pública)', async () => {
    const promesa = api.solicitarRecuperacionPorCorreo('maria.zambrano@correo.com');

    const peticion = controlador.expectOne(`${URL}/autenticacion/recuperacion/solicitud`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ correo: 'maria.zambrano@correo.com' });
    peticion.flush(null, { status: 204, statusText: 'Sin contenido' });

    await expect(promesa).resolves.toBeUndefined();
    expect(RUTAS_PUBLICAS).toContain('/autenticacion/recuperacion/solicitud');
    expect(RUTAS_PUBLICAS).not.toContain('/usuarios/yo/correo/verificacion');
    expect(RUTAS_PUBLICAS).not.toContain('/usuarios/yo/correo/confirmacion');
  });

  it('sin conexión → ErrorSinConexion', async () => {
    const promesa = api.solicitarRecuperacionPorCorreo('maria@correo.com');
    controlador
      .expectOne(`${URL}/autenticacion/recuperacion/solicitud`)
      .error(new ProgressEvent('error'), { status: 0 });

    await expect(promesa).rejects.toBeInstanceOf(ErrorSinConexion);
  });
});