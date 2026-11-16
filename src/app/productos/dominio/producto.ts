import { Dinero } from '../../compartido/dominio/dinero';
import { esResumenMarca, ResumenMarca } from './marca';

/** RN-09 / D-47: la disponibilidad la define el servidor; la app solo la muestra. */
export type Disponibilidad = 'DISPONIBLE' | 'AGOTADO' | 'PENDIENTE_REPOSICION';

export const DISPONIBILIDADES: readonly Disponibilidad[] = [
  'DISPONIBLE',
  'AGOTADO',
  'PENDIENTE_REPOSICION',
];

export interface ImagenProducto {
  readonly id: string;
  /** URL ya resuelta contra el servidor (el adaptador la completa; D-46). */
  readonly url: string;
  readonly orden: number;
  readonly principal: boolean;
}

export interface Producto {
  readonly id: string;
  readonly nombre: string;
  readonly marca: ResumenMarca;
  /** Dinero exacto: nunca un número de punto flotante (RN-11). */
  readonly precio: Dinero;
  readonly descripcion: string;
  readonly disponibilidad: Disponibilidad;
  readonly imagenes: readonly ImagenProducto[];
}

/** Datos del producto como llegan de la API, antes de convertir el precio. */
export interface ProductoRemoto {
  readonly id: string;
  readonly nombre: string;
  readonly marca: ResumenMarca;
  readonly precio: string;
  readonly descripcion: string;
  readonly disponibilidad: Disponibilidad;
  readonly imagenes: readonly ImagenProducto[];
}

export function esDisponibilidad(valor: unknown): valor is Disponibilidad {
  return DISPONIBILIDADES.includes(valor as Disponibilidad);
}

function esImagen(valor: unknown): valor is ImagenProducto {
  if (typeof valor !== 'object' || valor === null) return false;
  const i = valor as Record<string, unknown>;
  return (
    typeof i['id'] === 'string' &&
    typeof i['url'] === 'string' &&
    i['url'].length > 0 &&
    typeof i['orden'] === 'number' &&
    typeof i['principal'] === 'boolean'
  );
}

/** Comprueba la forma de un producto de la API (contrato, «Producto»). */
export function esProductoRemoto(valor: unknown): valor is ProductoRemoto {
  if (typeof valor !== 'object' || valor === null) return false;
  const p = valor as Record<string, unknown>;
  return (
    typeof p['id'] === 'string' &&
    p['id'].length > 0 &&
    typeof p['nombre'] === 'string' &&
    esResumenMarca(p['marca']) &&
    typeof p['precio'] === 'string' &&
    typeof p['descripcion'] === 'string' &&
    esDisponibilidad(p['disponibilidad']) &&
    Array.isArray(p['imagenes']) &&
    p['imagenes'].every(esImagen)
  );
}

/** Convierte el producto de la API en el del dominio (precio exacto). */
export function crearProducto(remoto: ProductoRemoto): Producto {
  return { ...remoto, precio: Dinero.desdeTexto(remoto.precio) };
}

/** Imagen principal: la marcada como principal o, si no hay, la de menor orden. */
export function imagenPrincipal(producto: Pick<Producto, 'imagenes'>): ImagenProducto | null {
  const marcada = producto.imagenes.find((i) => i.principal);
  if (marcada) return marcada;
  const ordenadas = [...producto.imagenes].sort((a, b) => a.orden - b.orden);
  return ordenadas[0] ?? null;
}

/** Texto para el Cliente. Los agotados y pendientes se muestran, no se ocultan (RN-09). */
export function etiquetaDisponibilidad(disponibilidad: Disponibilidad): string {
  switch (disponibilidad) {
    case 'DISPONIBLE':
      return 'Disponible';
    case 'AGOTADO':
      return 'Agotado';
    case 'PENDIENTE_REPOSICION':
      return 'Pendiente de reposición';
  }
}

/** Precio en texto con dos decimales y punto, como en el diseño aprobado («$12.50»). */
export function precioEnTexto(precio: Dinero): string {
  return `$${precio.aTexto()}`;
}
