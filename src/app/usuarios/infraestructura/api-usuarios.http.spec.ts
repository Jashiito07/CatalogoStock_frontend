import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { URL_API } from '../../compartido/compartido.providers';
import { ErrorApi, ErrorSinConexion } from '../../compartido/dominio/error-api';
import { SESION_DE_PRUEBA } from '../pruebas/datos-de-prueba';
import { AVISO_DE_PRUEBA } from '../pruebas/dobles';
import { ApiUsuariosHttp } from './api-usuarios.http';

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
