import { CONTRASTE_MINIMO, razonDeContraste } from '../../compartido/dominio/contraste';

/**
 * Marca tal como la devuelve `GET /marcas` (docs/contrato-api/productos.md, «Marca»).
 * RF-CAT-05 / D-43: cada marca trae su color principal y un acento opcional; el servidor
 * calcula el texto legible sobre cada uno (RNF-11). TypeScript puro (RNF-14).
 */
export interface ResumenMarca {
  readonly id: string;
  readonly nombre: string;
  /** Color principal `#RRGGBB`. */
  readonly color: string;
  /** Acento opcional `#RRGGBB` (Leonisa: negro con acento naranja). */
  readonly colorAcento: string | null;
  /** Texto con contraste ≥ 4.5:1 sobre `color` (calculado por el servidor). */
  readonly textoSobreColor: string;
  /** Texto con contraste ≥ 4.5:1 sobre `colorAcento`, o `null` si no hay acento. */
  readonly textoSobreAcento: string | null;
}

export interface Marca extends ResumenMarca {
  readonly activa: boolean;
  readonly orden: number;
}

const PATRON_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function esColor(valor: unknown): valor is string {
  return typeof valor === 'string' && PATRON_COLOR.test(valor);
}

/** Comprueba la forma del resumen de marca de una respuesta de la API. */
export function esResumenMarca(valor: unknown): valor is ResumenMarca {
  if (typeof valor !== 'object' || valor === null) return false;
  const m = valor as Record<string, unknown>;
  return (
    typeof m['id'] === 'string' &&
    m['id'].length > 0 &&
    typeof m['nombre'] === 'string' &&
    m['nombre'].length > 0 &&
    esColor(m['color']) &&
    (m['colorAcento'] === null || esColor(m['colorAcento'])) &&
    esColor(m['textoSobreColor']) &&
    (m['textoSobreAcento'] === null || esColor(m['textoSobreAcento']))
  );
}

/** Comprueba la forma de una marca de `GET /marcas`. */
export function esMarca(valor: unknown): valor is Marca {
  if (!esResumenMarca(valor)) return false;
  const m = valor as unknown as Record<string, unknown>;
  return (
    typeof m['activa'] === 'boolean' &&
    typeof m['orden'] === 'number' &&
    Number.isInteger(m['orden']) &&
    m['orden'] >= 0
  );
}

/** Textos candidatos del contrato, en el mismo orden con el que los elige el servidor. */
const TEXTOS_CANDIDATOS: readonly string[] = ['#FFFFFF', '#1E293B', '#0F172A', '#000000'];

/**
 * Texto legible sobre un color de fondo. Se usa el que calcula el servidor (para que la
 * app y el panel coincidan, RNF-11); solo si no cumple 4.5:1 —respuesta atrasada o
 * defectuosa— se recalcula como respaldo con la misma regla del contrato.
 */
export function textoLegibleSobre(fondo: string, textoServidor: string | null): string {
  if (textoServidor !== null && razonDeContraste(fondo, textoServidor) >= CONTRASTE_MINIMO) {
    return textoServidor;
  }
  const elegido = TEXTOS_CANDIDATOS.find((c) => razonDeContraste(fondo, c) >= CONTRASTE_MINIMO);
  return elegido ?? '#000000';
}
