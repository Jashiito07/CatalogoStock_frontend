import { OpcionChip, VistaEstado, VistaMarca, VistaProducto } from '../../compartido/presentacion/vistas';
import { Marca, ResumenMarca, textoLegibleSobre } from '../dominio/marca';
import {
  Disponibilidad,
  DISPONIBILIDADES,
  etiquetaDisponibilidad,
  imagenPrincipal,
  precioEnTexto,
  Producto,
} from '../dominio/producto';

const ESTADO_POR_DISPONIBILIDAD: Readonly<Record<Disponibilidad, Pick<VistaEstado, 'icono' | 'tipo'>>> = {
  DISPONIBLE: { icono: 'pi pi-check-circle', tipo: 'ok' },
  AGOTADO: { icono: 'pi pi-ban', tipo: 'mal' },
  PENDIENTE_REPOSICION: { icono: 'pi pi-clock', tipo: 'warn' },
};

/** Marca con sus colores ya resueltos; el texto es el que calculó el servidor (RNF-11). */
export function aVistaMarca(marca: ResumenMarca | Marca): VistaMarca {
  return {
    id: marca.id,
    nombre: marca.nombre,
    color: marca.color,
    texto: textoLegibleSobre(marca.color, marca.textoSobreColor),
    acento: marca.colorAcento,
    textoAcento:
      marca.colorAcento === null
        ? null
        : textoLegibleSobre(marca.colorAcento, marca.textoSobreAcento),
  };
}

/** Disponibilidad con texto, ícono y tono; los tres estados se muestran, ninguno se oculta (RN-09). */
export function aVistaEstado(disponibilidad: Disponibilidad): VistaEstado {
  return { texto: etiquetaDisponibilidad(disponibilidad), ...ESTADO_POR_DISPONIBILIDAD[disponibilidad] };
}

/** Producto del dominio → datos de las tarjetas y de la hoja. Solo muestra, no calcula. */
export function aVistaProducto(producto: Producto): VistaProducto {
  return {
    id: producto.id,
    nombre: producto.nombre,
    precio: precioEnTexto(producto.precio),
    descripcion: producto.descripcion,
    imagenUrl: imagenPrincipal(producto)?.url ?? null,
    marca: aVistaMarca(producto.marca),
    estado: aVistaEstado(producto.disponibilidad),
    atenuado: producto.disponibilidad === 'AGOTADO',
  };
}

/** Chips de disponibilidad: «Todo» (sin filtro) y los tres estados del servidor. */
export const OPCIONES_DISPONIBILIDAD: readonly OpcionChip[] = [
  { valor: null, etiqueta: 'Todo' },
  ...DISPONIBILIDADES.map((valor) => ({ valor, etiqueta: etiquetaDisponibilidad(valor) })),
];
