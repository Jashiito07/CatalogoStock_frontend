import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Mock, Mocked } from 'vitest';

import { BASE_DATOS_LOCAL, URL_API } from '../../compartido/compartido.providers';
import { ErrorApi, ErrorSinConexion } from '../../compartido/dominio/error-api';
import { GestorSesion } from '../aplicacion/gestor-sesion';
import { ApiUsuarios } from '../aplicacion/puertos/api-usuarios.puerto';
import { ErrorSesionExpirada } from '../dominio/errores';
import { SESION_DE_PRUEBA, SESION_RENOVADA } from '../pruebas/datos-de-prueba';
import { AlmacenSesionEnMemoria, crearApiFalsa } from '../pruebas/dobles';
import { interceptorAutenticacion } from './interceptor-autenticacion';

const URL = 'http://api.prueba/api/v1';
const VENCIDO = { codigo: 'TOKEN_VENCIDO', mensaje: 'El token venció.', detalles: {} };
const esperar = () => new Promise((resolver) => setTimeout(resolver, 0));

describe('Interceptor de autenticación (D-09, contrato README)', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;
  let api: Mocked<ApiUsuarios>;
  let almacen: AlmacenSesionEnMemoria;
  let gestor: GestorSesion;
  let navegar: ReturnType<typeof vi.spyOn>;
  let baseLocal: Record<'iniciar' | 'ejecutar' | 'consultar' | 'ejecutarTransaccion', Mock>;

  beforeEach(async () => {
    // La base local (SQLite, donde vivirá la cola de cambios) solo se observa: el
    // interceptor y la sesión nunca deben tocarla.
    baseLocal = {
      iniciar: vi.fn(),
      ejecutar: vi.fn(),
      consultar: vi.fn(),
      ejecutarTransaccion: vi.fn(),
    };
    api = crearApiFalsa();
    api.renovar.mockResolvedValue(SESION_RENOVADA);
    almacen = new AlmacenSesionEnMemoria(SESION_DE_PRUEBA);
    gestor = new GestorSesion(api, almacen);
    await gestor.restaurar();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([interceptorAutenticacion])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: URL_API, useValue: URL },
        { provide: GestorSesion, useValue: gestor },
        { provide: BASE_DATOS_LOCAL, useValue: baseLocal },
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => controlador.verify());

  it('agrega el token de acceso a las rutas protegidas de la API', async () => {
    const respuesta = firstValueFrom(http.get(`${URL}/usuarios/yo`));

    const solicitud = controlador.expectOne(`${URL}/usuarios/yo`);
    expect(solicitud.request.headers.get('Authorization')).toBe('Bearer acceso-1');
    solicitud.flush(SESION_DE_PRUEBA.usuario);
    await respuesta;
  });

  it('RF-USU-05: el cambio de clave es protegido y lleva el token de acceso', async () => {
    const respuesta = firstValueFrom(http.post(`${URL}/usuarios/yo/clave`, {}));
    const solicitud = controlador.expectOne(`${URL}/usuarios/yo/clave`);
    expect(solicitud.request.headers.get('Authorization')).toBe('Bearer acceso-1');
    solicitud.flush(null, { status: 204, statusText: 'Sin contenido' });
    await respuesta;
  });

  it.each([
    '/autenticacion/ingreso/cliente',
    '/usuarios/registro',
    '/autenticacion/renovacion',
    '/privacidad/aviso',
    '/autenticacion/recuperacion',
  ])(
    'no envía el token a la ruta pública %s',
    async (ruta) => {
      const respuesta = firstValueFrom(http.post(`${URL}${ruta}`, {}));
      const solicitud = controlador.expectOne(`${URL}${ruta}`);
      expect(solicitud.request.headers.has('Authorization')).toBe(false);
      solicitud.flush({});
      await respuesta;
    },
  );

  it('no envía el token a otros servidores', async () => {
    const respuesta = firstValueFrom(http.get('https://otro.servidor/datos'));
    const solicitud = controlador.expectOne('https://otro.servidor/datos');
    expect(solicitud.request.headers.has('Authorization')).toBe(false);
    solicitud.flush({});
    await respuesta;
  });

  it('ante 401 TOKEN_VENCIDO renueva y repite la solicitud una vez con el token nuevo', async () => {
    const respuesta = firstValueFrom(http.get(`${URL}/usuarios/yo`));

    controlador.expectOne(`${URL}/usuarios/yo`).flush(VENCIDO, { status: 401, statusText: 'No autorizado' });
    await esperar();
    const repetida = controlador.expectOne(`${URL}/usuarios/yo`);
    expect(repetida.request.headers.get('Authorization')).toBe('Bearer acceso-2');
    repetida.flush(SESION_DE_PRUEBA.usuario);

    expect(await respuesta).toEqual(SESION_DE_PRUEBA.usuario);
    expect(api.renovar).toHaveBeenCalledWith('renovacion-1');
    expect(almacen.guardada).toEqual(SESION_RENOVADA);
  });

  it('renueva una sola vez ante varias 401 simultáneas', async () => {
    const respuestas = [1, 2, 3].map((n) => firstValueFrom(http.get(`${URL}/recurso/${n}`)));

    for (const n of [1, 2, 3]) {
      controlador.expectOne(`${URL}/recurso/${n}`).flush(VENCIDO, { status: 401, statusText: 'No autorizado' });
    }
    await esperar();
    for (const n of [1, 2, 3]) {
      const repetida = controlador.expectOne(`${URL}/recurso/${n}`);
      expect(repetida.request.headers.get('Authorization')).toBe('Bearer acceso-2');
      repetida.flush({ n });
    }

    expect(await Promise.all(respuestas)).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
    expect(api.renovar).toHaveBeenCalledTimes(1);
  });

  it('si la renovación es rechazada, cierra la sesión y lleva al ingreso', async () => {
    api.renovar.mockRejectedValue(new ErrorApi(401, 'TOKEN_INVALIDO', 'x'));
    const respuesta = firstValueFrom(http.get(`${URL}/usuarios/yo`));

    controlador.expectOne(`${URL}/usuarios/yo`).flush(VENCIDO, { status: 401, statusText: 'No autorizado' });

    await expect(respuesta).rejects.toBeInstanceOf(ErrorSesionExpirada);
    expect(gestor.actual()).toBeNull();
    expect(almacen.guardada).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/ingreso'], { queryParams: { motivo: 'sesion-expirada' } });
  });

  it('TOKEN_INVALIDO borra solo la sesión: no toca la base local ni la cola de cambios (contrato «App móvil»)', async () => {
    api.renovar.mockRejectedValue(new ErrorApi(401, 'TOKEN_INVALIDO', 'x'));
    const respuesta = firstValueFrom(http.get(`${URL}/usuarios/yo`));

    controlador.expectOne(`${URL}/usuarios/yo`).flush(VENCIDO, { status: 401, statusText: 'No autorizado' });

    await expect(respuesta).rejects.toBeInstanceOf(ErrorSesionExpirada);
    expect(almacen.guardada).toBeNull();
    for (const operacion of Object.values(baseLocal)) expect(operacion).not.toHaveBeenCalled();
  });

  it('D-10: sin conexión durante la renovación conserva la sesión y no lleva al ingreso', async () => {
    api.renovar.mockRejectedValue(new ErrorSinConexion());
    const respuesta = firstValueFrom(http.get(`${URL}/usuarios/yo`));

    controlador.expectOne(`${URL}/usuarios/yo`).flush(VENCIDO, { status: 401, statusText: 'No autorizado' });

    await expect(respuesta).rejects.toBeInstanceOf(ErrorSinConexion);
    expect(gestor.actual()).toEqual(SESION_DE_PRUEBA);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('solo repite una vez: un segundo 401 cierra la sesión', async () => {
    const respuesta = firstValueFrom(http.get(`${URL}/usuarios/yo`));

    controlador.expectOne(`${URL}/usuarios/yo`).flush(VENCIDO, { status: 401, statusText: 'No autorizado' });
    await esperar();
    controlador.expectOne(`${URL}/usuarios/yo`).flush(VENCIDO, { status: 401, statusText: 'No autorizado' });

    await expect(respuesta).rejects.toMatchObject({ status: 401 });
    await esperar();
    expect(api.renovar).toHaveBeenCalledTimes(1);
    expect(gestor.actual()).toBeNull();
    expect(navegar).toHaveBeenCalled();
  });

  it('otro 401 (NO_AUTENTICADO) lleva al ingreso sin intentar renovar', async () => {
    const respuesta = firstValueFrom(http.get(`${URL}/usuarios/yo`));

    controlador
      .expectOne(`${URL}/usuarios/yo`)
      .flush({ codigo: 'NO_AUTENTICADO', mensaje: 'x' }, { status: 401, statusText: 'No autorizado' });

    await expect(respuesta).rejects.toMatchObject({ status: 401 });
    expect(api.renovar).not.toHaveBeenCalled();
    expect(gestor.actual()).toBeNull();
    expect(navegar).toHaveBeenCalled();
  });

  it('un 403 no cierra la sesión (CA-02 lo decide la API)', async () => {
    const respuesta = firstValueFrom(http.get(`${URL}/auditoria`));

    controlador
      .expectOne(`${URL}/auditoria`)
      .flush({ codigo: 'NO_AUTORIZADO', mensaje: 'x' }, { status: 403, statusText: 'Prohibido' });

    await expect(respuesta).rejects.toMatchObject({ status: 403 });
    expect(gestor.actual()).toEqual(SESION_DE_PRUEBA);
  });
});
