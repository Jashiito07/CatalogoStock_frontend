import { Mocked, vi } from 'vitest';

import { ApiProductos } from '../aplicacion/puertos/api-productos.puerto';
import { PaginaProductos } from '../dominio/consulta';
import { Marca } from '../dominio/marca';
import { crearProducto, Disponibilidad, Producto, ProductoRemoto } from '../dominio/producto';

/** Marcas de prueba con los colores medidos de docs/diseno/colores-marcas.md (D-43). */
export const YANBAL: Marca = {
  id: 'm-yanbal',
  nombre: 'Yanbal',
  color: '#FC5823',
  colorAcento: null,
  textoSobreColor: '#1E293B',
  textoSobreAcento: null,
  activa: true,
  orden: 0,
};
export const AVON: Marca = {
  id: 'm-avon',
  nombre: 'Avon',
  color: '#FF2469',
  colorAcento: null,
  textoSobreColor: '#0F172A',
  textoSobreAcento: null,
  activa: true,
  orden: 1,
};
export const LBEL: Marca = {
  id: 'm-lbel',
  nombre: "L'Bel",
  color: '#2E1A47',
  colorAcento: null,
  textoSobreColor: '#FFFFFF',
  textoSobreAcento: null,
  activa: true,
  orden: 2,
};
export const LEONISA: Marca = {
  id: 'm-leonisa',
  nombre: 'Leonisa',
  color: '#222221',
  colorAcento: '#F36E21',
  textoSobreColor: '#FFFFFF',
  textoSobreAcento: '#1E293B',
  activa: true,
  orden: 3,
};
export const MARCAS_DE_PRUEBA: readonly Marca[] = [YANBAL, AVON, LBEL, LEONISA];

export function resumenDe(marca: Marca): ProductoRemoto['marca'] {
  const { id, nombre, color, colorAcento, textoSobreColor, textoSobreAcento } = marca;
  return { id, nombre, color, colorAcento, textoSobreColor, textoSobreAcento };
}

/** Producto remoto tal como lo entrega la API (precio en texto). */
export function productoRemoto(
  id: string,
  nombre: string,
  precio: string,
  opciones: {
    marca?: Marca;
    disponibilidad?: Disponibilidad;
    urlImagen?: string | null;
  } = {},
): ProductoRemoto {
  const { marca = YANBAL, disponibilidad = 'DISPONIBLE', urlImagen = null } = opciones;
  return {
    id,
    nombre,
    marca: resumenDe(marca),
    precio,
    descripcion: '',
    disponibilidad,
    imagenes:
      urlImagen === null ? [] : [{ id: `i-${id}`, url: urlImagen, orden: 0, principal: true }],
  };
}

export function producto(
  id: string,
  nombre: string,
  precio: string,
  opciones: Parameters<typeof productoRemoto>[3] = {},
): Producto {
  return crearProducto(productoRemoto(id, nombre, precio, opciones));
}

export function pagina(
  elementos: readonly Producto[],
  total = elementos.length,
  numero = 1,
): PaginaProductos {
  return { elementos, pagina: numero, tamanio: 20, total };
}

export function crearApiProductosFalsa(): Mocked<ApiProductos> {
  return {
    listarMarcas: vi.fn<ApiProductos['listarMarcas']>(async () => MARCAS_DE_PRUEBA),
    listarProductos: vi.fn<ApiProductos['listarProductos']>(async () => pagina([])),
  };
}
