import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { URL_API } from '../../compartido/compartido.providers';
import { ErrorApi, ErrorSinConexion } from '../../compartido/dominio/error-api';
import { MARCAS_DE_PRUEBA, productoRemoto, LEONISA } from '../pruebas/datos-de-prueba';
import { ApiProductosHttp, resolverUrlImagen } from './api-productos.http';

const URL = 'http://api.prueba:3000/api/v1';
const CONSULTA = { marcaId: null, busqueda: '', disponibilidad: null, pagina: 1, tamanio: 20 };

describe('ApiProductosHttp (docs/contrato-api/productos.md)', () => {
  let api: ApiProductosHttp;
  let controlador: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: URL_API, useValue: URL }],
    });
    api = TestBed.inject(ApiProductosHttp);
    controlador = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controlador.verify());

  it('GET /marcas devuelve las marcas con su color, acento y texto calculado', async () => {
    const promesa = api.listarMarcas();
    const peticion = controlador.expectOne(`${URL}/marcas`);
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ elementos: MARCAS_DE_PRUEBA });

    const marcas = await promesa;
    expect(marcas).toHaveLength(4);
    expect(marcas[3]).toMatchObject({
      nombre: 'Leonisa',
      color: '#222221',
      colorAcento: '#F36E21',
      textoSobreColor: '#FFFFFF',
      textoSobreAcento: '#1E293B',
    });
  });

  it('GET /marcas con una marca mal formada responde ERROR_INTERNO', async () => {
    const promesa = api.listarMarcas();
    controlador.expectOne(`${URL}/marcas`).flush({ elementos: [{ ...LEONISA, color: 'x' }] });
    await expect(promesa).rejects.toMatchObject({ codigo: 'ERROR_INTERNO' });
  });

  it('RF-CAT-03: GET /productos pagina sin filtros vacíos en la URL', async () => {
    const promesa = api.listarProductos({ ...CONSULTA, pagina: 2 });
    const peticion = controlador.expectOne((r) => r.url === `${URL}/productos`);
    expect(peticion.request.params.get('pagina')).toBe('2');
    expect(peticion.request.params.get('tamanio')).toBe('20');
    expect(peticion.request.params.has('marcaId')).toBe(false);
    expect(peticion.request.params.has('busqueda')).toBe(false);
    expect(peticion.request.params.has('disponibilidad')).toBe(false);
    peticion.flush({ elementos: [], pagina: 2, tamanio: 20, total: 0 });

    expect(await promesa).toEqual({ elementos: [], pagina: 2, tamanio: 20, total: 0 });
  });

  it('RF-CAT-03: envía marcaId, busqueda y disponibilidad como el contrato', async () => {
    const promesa = api.listarProductos({
      marcaId: 'm-yanbal',
      busqueda: 'crema',
      disponibilidad: 'PENDIENTE_REPOSICION',
      pagina: 1,
      tamanio: 20,
    });
    const peticion = controlador.expectOne((r) => r.url === `${URL}/productos`);
    expect(peticion.request.params.get('marcaId')).toBe('m-yanbal');
    expect(peticion.request.params.get('busqueda')).toBe('crema');
    expect(peticion.request.params.get('disponibilidad')).toBe('PENDIENTE_REPOSICION');
    peticion.flush({ elementos: [], pagina: 1, tamanio: 20, total: 0 });
    await promesa;
  });

  it('convierte el precio en dinero exacto y completa la URL de la imagen (D-46)', async () => {
    const promesa = api.listarProductos(CONSULTA);
    controlador.expectOne((r) => r.url === `${URL}/productos`).flush({
      elementos: [
        productoRemoto('p1', 'Crema hidratante', '12.50', {
          urlImagen: '/api/v1/imagenes/0f0e0d0c-0b0a-0908-0706-050403020100.jpg',
        }),
        productoRemoto('p2', 'Labial', '9.75', { disponibilidad: 'AGOTADO' }),
      ],
      pagina: 1,
      tamanio: 20,
      total: 2,
    });

    const resultado = await promesa;
    expect(resultado.elementos[0].precio.centavos).toBe(1250);
    expect(resultado.elementos[0].imagenes[0].url).toBe(
      'http://api.prueba:3000/api/v1/imagenes/0f0e0d0c-0b0a-0908-0706-050403020100.jpg',
    );
    // RN-09: los agotados llegan y no se descartan.
    expect(resultado.elementos[1].disponibilidad).toBe('AGOTADO');
    expect(resultado.total).toBe(2);
  });

  it('un precio fuera del contrato o un producto malformado responde ERROR_INTERNO', async () => {
    const primera = api.listarProductos(CONSULTA);
    controlador
      .expectOne((r) => r.url === `${URL}/productos`)
      .flush({ elementos: [productoRemoto('p1', 'Crema', '12.505')], pagina: 1, tamanio: 20, total: 1 });
    await expect(primera).rejects.toMatchObject({ codigo: 'ERROR_INTERNO' });

    const segunda = api.listarProductos(CONSULTA);
    controlador
      .expectOne((r) => r.url === `${URL}/productos`)
      .flush({ elementos: [{ id: 'x' }], pagina: 1, tamanio: 20, total: 1 });
    await expect(segunda).rejects.toBeInstanceOf(ErrorApi);
  });

  it('sin respuesta del servidor lanza ErrorSinConexion', async () => {
    const promesa = api.listarProductos(CONSULTA);
    controlador
      .expectOne((r) => r.url === `${URL}/productos`)
      .error(new ProgressEvent('error'), { status: 0 });
    await expect(promesa).rejects.toBeInstanceOf(ErrorSinConexion);
  });

  it('un error del contrato llega como ErrorApi con su código', async () => {
    const promesa = api.listarProductos(CONSULTA);
    controlador
      .expectOne((r) => r.url === `${URL}/productos`)
      .flush(
        { codigo: 'DATOS_INVALIDOS', mensaje: 'Datos inválidos.', detalles: {} },
        { status: 400, statusText: 'Bad Request' },
      );
    await expect(promesa).rejects.toMatchObject({ estado: 400, codigo: 'DATOS_INVALIDOS' });
  });
});

describe('resolverUrlImagen', () => {
  it('antepone el servidor de la API a la ruta pública y respeta las URL absolutas', () => {
    expect(resolverUrlImagen('https://api.ejemplo.ec/api/v1', '/api/v1/imagenes/a.png')).toBe(
      'https://api.ejemplo.ec/api/v1/imagenes/a.png',
    );
    expect(resolverUrlImagen('http://localhost:3000/api/v1', 'api/v1/imagenes/a.png')).toBe(
      'http://localhost:3000/api/v1/imagenes/a.png',
    );
    expect(resolverUrlImagen('http://localhost:3000/api/v1', 'https://cdn.ec/a.png')).toBe(
      'https://cdn.ec/a.png',
    );
  });
});
