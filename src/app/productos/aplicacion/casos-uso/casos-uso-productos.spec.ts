import { ErrorApi, ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { ConectividadFalsa } from '../../../usuarios/pruebas/dobles';
import { SIN_FILTROS, TAMANIO_PAGINA } from '../../dominio/consulta';
import {
  crearApiProductosFalsa,
  LBEL,
  MARCAS_DE_PRUEBA,
  pagina,
  producto,
  YANBAL,
} from '../../pruebas/datos-de-prueba';
import { ConsultarMarcas } from './consultar-marcas.caso-uso';
import { ConsultarProductos } from './consultar-productos.caso-uso';

describe('ConsultarProductos (RF-CAT-03)', () => {
  it('pide la página con los filtros y el tamaño del contrato', async () => {
    const api = crearApiProductosFalsa();
    const esperada = pagina([producto('p1', 'Crema', '12.50')], 1);
    api.listarProductos.mockResolvedValue(esperada);
    const caso = new ConsultarProductos(api, new ConectividadFalsa(true));

    const resultado = await caso.ejecutar(
      { marcaId: YANBAL.id, busqueda: '  crema ', disponibilidad: 'AGOTADO' },
      2,
    );

    expect(resultado).toBe(esperada);
    expect(api.listarProductos).toHaveBeenCalledWith({
      marcaId: YANBAL.id,
      busqueda: 'crema',
      disponibilidad: 'AGOTADO',
      pagina: 2,
      tamanio: TAMANIO_PAGINA,
    });
  });

  it('RNF-06: sin conexión falla con ErrorSinConexion y no llama al servidor', async () => {
    const api = crearApiProductosFalsa();
    const caso = new ConsultarProductos(api, new ConectividadFalsa(false));

    await expect(caso.ejecutar(SIN_FILTROS)).rejects.toBeInstanceOf(ErrorSinConexion);
    expect(api.listarProductos).not.toHaveBeenCalled();
  });

  it('propaga los errores del servidor sin ocultarlos', async () => {
    const api = crearApiProductosFalsa();
    api.listarProductos.mockRejectedValue(new ErrorApi(500, 'ERROR_INTERNO', 'Falla'));
    const caso = new ConsultarProductos(api, new ConectividadFalsa(true));

    await expect(caso.ejecutar(SIN_FILTROS)).rejects.toMatchObject({ estado: 500 });
  });
});

describe('ConsultarMarcas (RF-CAT-05)', () => {
  it('devuelve solo las marcas activas', async () => {
    const api = crearApiProductosFalsa();
    api.listarMarcas.mockResolvedValue([YANBAL, { ...LBEL, activa: false }]);
    const caso = new ConsultarMarcas(api, new ConectividadFalsa(true));

    expect(await caso.ejecutar()).toEqual([YANBAL]);
  });

  it('RN-07: sin conexión reutiliza la última lista de la sesión', async () => {
    const api = crearApiProductosFalsa();
    const conectividad = new ConectividadFalsa(true);
    const caso = new ConsultarMarcas(api, conectividad);
    expect(await caso.ejecutar()).toEqual(MARCAS_DE_PRUEBA);

    conectividad.conectado = false;
    expect(await caso.ejecutar()).toEqual(MARCAS_DE_PRUEBA);
    expect(api.listarMarcas).toHaveBeenCalledTimes(1);

    conectividad.conectado = true;
    api.listarMarcas.mockRejectedValue(new ErrorSinConexion());
    expect(await caso.ejecutar()).toEqual(MARCAS_DE_PRUEBA);
  });

  it('sin conexión y sin lista previa falla con ErrorSinConexion', async () => {
    const caso = new ConsultarMarcas(crearApiProductosFalsa(), new ConectividadFalsa(false));
    await expect(caso.ejecutar()).rejects.toBeInstanceOf(ErrorSinConexion);
  });

  it('un error del servidor se propaga', async () => {
    const api = crearApiProductosFalsa();
    api.listarMarcas.mockRejectedValue(new ErrorApi(500, 'ERROR_INTERNO', 'Falla'));
    const caso = new ConsultarMarcas(api, new ConectividadFalsa(true));
    await expect(caso.ejecutar()).rejects.toMatchObject({ estado: 500 });
  });
});
