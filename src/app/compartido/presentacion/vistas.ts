/**
 * Vistas planas que reciben los componentes compartidos (rediseño, etapa 2). Los módulos
 * convierten sus datos del dominio en estas vistas; así los componentes de `compartido`
 * no conocen los módulos de negocio. Los colores de marca ya vienen resueltos (el texto lo
 * calcula el servidor por contraste, RNF-11); los componentes no escriben hexadecimales.
 */

/** Color y texto legible de una marca (RF-CAT-05, D-43). */
export interface VistaMarca {
  readonly id: string;
  readonly nombre: string;
  readonly color: string;
  /** Texto con contraste ≥ 4.5:1 sobre `color`. */
  readonly texto: string;
  readonly acento: string | null;
  /** Texto con contraste ≥ 4.5:1 sobre `acento`. */
  readonly textoAcento: string | null;
}

/** Tono de una etiqueta de estado; siempre se acompaña de texto e ícono (RNF-11). */
export type TipoEstado = 'ok' | 'warn' | 'mal' | 'info';

export interface VistaEstado {
  readonly texto: string;
  readonly icono: string;
  readonly tipo: TipoEstado;
}

/** Datos que se muestran de un producto; nada se calcula en la app (RN-07, RN-11). */
export interface VistaProducto {
  readonly id: string;
  readonly nombre: string;
  /** Precio ya formateado a partir de dinero exacto (por ejemplo «$12.50»). */
  readonly precio: string;
  readonly descripcion: string;
  readonly imagenUrl: string | null;
  readonly marca: VistaMarca;
  readonly estado: VistaEstado;
  /** Se atenúa la imagen cuando el producto no se puede comprar (agotado). */
  readonly atenuado: boolean;
}

/** Opción de un grupo de chips de filtro. */
export interface OpcionChip<T extends string | null = string | null> {
  readonly valor: T;
  readonly etiqueta: string;
  readonly icono?: string;
}
