import { ConsultaProductos, PaginaProductos } from '../../dominio/consulta';
import { Marca } from '../../dominio/marca';

/**
 * Puerto de la API de marcas y productos (docs/contrato-api/productos.md).
 * Subfase 2.7: lectura en línea; el catálogo sin conexión llega en la Fase 4.
 */
export interface ApiProductos {
  /** `GET /marcas`: marcas activas, ordenadas por `orden` y luego por nombre. */
  listarMarcas(): Promise<readonly Marca[]>;
  /** `GET /productos`: una página, con búsqueda y filtros del servidor. */
  listarProductos(consulta: ConsultaProductos): Promise<PaginaProductos>;
}
