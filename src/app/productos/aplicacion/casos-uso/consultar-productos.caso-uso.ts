import { Conectividad } from '../../../compartido/aplicacion/puertos/conectividad.puerto';
import { ErrorSinConexion } from '../../../compartido/dominio/error-api';
import {
  ConsultaProductos,
  FiltroProductos,
  normalizarBusqueda,
  PaginaProductos,
  TAMANIO_PAGINA,
} from '../../dominio/consulta';
import { ApiProductos } from '../puertos/api-productos.puerto';

/**
 * Pide una página del catálogo al servidor (RF-CAT-03). Es una consulta en línea: sin
 * conexión lanza `ErrorSinConexion` (el uso sin conexión llega en la Fase 4, RF-SIN-01).
 * Los precios, la disponibilidad y el orden son los del servidor; la app no los calcula.
 */
export class ConsultarProductos {
  constructor(
    private readonly api: ApiProductos,
    private readonly conectividad: Conectividad,
  ) {}

  async ejecutar(filtro: FiltroProductos, pagina = 1): Promise<PaginaProductos> {
    if (!(await this.conectividad.estaConectado())) throw new ErrorSinConexion();
    const consulta: ConsultaProductos = {
      ...filtro,
      busqueda: normalizarBusqueda(filtro.busqueda),
      pagina,
      tamanio: TAMANIO_PAGINA,
    };
    return this.api.listarProductos(consulta);
  }
}
