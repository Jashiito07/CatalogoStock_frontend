import { Disponibilidad, Producto } from './producto';

/** Tamaño de página que pide la app (contrato: por defecto 20, máximo 100). */
export const TAMANIO_PAGINA = 20;

/** Longitud máxima de la búsqueda (contrato: 1 a 100 caracteres). */
export const LARGO_MAXIMO_BUSQUEDA = 100;

/** Filtros del catálogo (RF-CAT-03): marca, búsqueda por nombre y disponibilidad. */
export interface FiltroProductos {
  readonly marcaId: string | null;
  readonly busqueda: string;
  readonly disponibilidad: Disponibilidad | null;
}

export const SIN_FILTROS: FiltroProductos = {
  marcaId: null,
  busqueda: '',
  disponibilidad: null,
};

export interface ConsultaProductos extends FiltroProductos {
  readonly pagina: number;
  readonly tamanio: number;
}

export interface PaginaProductos {
  readonly elementos: readonly Producto[];
  readonly pagina: number;
  readonly tamanio: number;
  readonly total: number;
}

/** La búsqueda llega recortada y sin pasar de 100 caracteres; vacía = sin búsqueda. */
export function normalizarBusqueda(texto: string): string {
  return texto.trim().slice(0, LARGO_MAXIMO_BUSQUEDA).trim();
}

export function hayFiltros(filtro: FiltroProductos): boolean {
  return (
    filtro.marcaId !== null || normalizarBusqueda(filtro.busqueda) !== '' || filtro.disponibilidad !== null
  );
}

/** ¿Quedan productos por pedir al servidor, dado lo ya cargado? */
export function hayMasProductos(cargados: number, total: number): boolean {
  return cargados < total;
}
