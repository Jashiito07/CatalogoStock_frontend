import { CONTRASTE_MINIMO, razonDeContraste } from '../../dominio/contraste';
import {
  COLORES_CORPORATIVOS as C,
  COLORES_OSCURO as O,
  TemaCatalogoStock,
} from './tema-catalogostock';

/** Escalas de PrimeNG (Tailwind) usadas por los estados; solo los tonos que se miden. */
const ESCALAS: Record<string, Record<number, string>> = {
  blue: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 300: '#93c5fd' },
  green: { 50: '#f0fdf4', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 300: '#86efac' },
  yellow: { 50: '#fefce8', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 300: '#fde047' },
  red: { 50: '#fef2f2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 300: '#fca5a5' },
};

type Rgb = [number, number, number];
const aRgb = (hex: string): Rgb =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const aHex = (rgb: Rgb) =>
  '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
/** Color `frente` con opacidad `alfa` sobre `fondo` (equivale a `color-mix(..., transparent)`). */
const sobre = (frente: string, fondo: string, alfa: number) =>
  aHex(aRgb(frente).map((v, i) => v * alfa + aRgb(fondo)[i]! * (1 - alfa)) as Rgb);

/** Lee `light-dark({color.tono}, {color.tono})` de un token del preset. */
function tonosDeEstado(ruta: string): { claro: string; oscuro: string; color: string } {
  const nodo = ruta
    .split('.')
    .reduce<unknown>((n, k) => (n as Record<string, unknown> | undefined)?.[k], TemaCatalogoStock);
  const valor = String((nodo as { color?: string }).color);
  const [, color, claro, oscuro] = /\{(\w+)\.(\d+)\}.*\{\w+\.(\d+)\}/.exec(valor) ?? [];
  const tono = (t: string | undefined) => ESCALAS[color!]![Number(t)]!;
  return { color: color!, claro: tono(claro), oscuro: tono(oscuro) };
}

/** RNF-11: texto de estado de `message` y `toast` sobre su fondo tintado. */
describe('Contraste del texto de estado de PrimeNG (RNF-11)', () => {
  const estados = ['info', 'success', 'warn', 'error'];
  for (const componente of ['message', 'toast']) {
    for (const severidad of estados) {
      const ruta = `components.${componente}.${severidad}`;
      it(`${componente}.${severidad}: ≥ 4.5 en claro (sobre blanco y fondo) y en oscuro (superficie y fondo)`, () => {
        const { color, claro, oscuro } = tonosDeEstado(ruta);
        const e = ESCALAS[color]!;
        for (const base of ['#FFFFFF', C.fondo]) {
          // Aura: fondo = tono 50 al 95 % sobre la superficie.
          expect(razonDeContraste(claro, sobre(e[50]!, base, 0.95))).toBeGreaterThanOrEqual(
            CONTRASTE_MINIMO,
          );
        }
        for (const base of [O.superficie, O.fondo]) {
          // Aura: fondo = tono 500 al 16 % sobre la superficie.
          expect(razonDeContraste(oscuro, sobre(e[500]!, base, 0.16))).toBeGreaterThanOrEqual(
            CONTRASTE_MINIMO,
          );
        }
      });
    }
  }
});

/** RNF-11: contraste mínimo de 4.5:1 en texto normal, en modo claro y en modo oscuro. */
describe('Contraste de la paleta (RNF-11)', () => {
  it('calcula la razón de referencia (blanco/negro = 21)', () => {
    expect(razonDeContraste('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
  });

  describe('modo claro', () => {
    const pares: [string, string, string][] = [
      ['texto sobre fondo', C.texto, C.fondo],
      ['blanco sobre Primario', C.sobreColor, C.primario],
      ['blanco sobre Secundario', C.sobreColor, C.secundario],
      ['Primario como texto sobre fondo', C.primario, C.fondo],
      ['Secundario como texto sobre fondo', C.secundario, C.fondo],
      ['texto sobre el Acento', C.texto, C.acento],
    ];
    for (const [nombre, texto, fondo] of pares) {
      it(`${nombre} ≥ 4.5`, () => {
        expect(razonDeContraste(texto, fondo)).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
      });
    }

    it('el blanco sobre el Acento NO cumple (por eso el texto del Acento es #1E293B)', () => {
      expect(razonDeContraste(C.sobreColor, C.acento)).toBeLessThan(CONTRASTE_MINIMO);
    });
  });

  describe('modo oscuro con violeta', () => {
    const pares: [string, string, string][] = [
      ['texto sobre fondo', O.texto, O.fondo],
      ['texto sobre superficie', O.texto, O.superficie],
      ['texto secundario sobre fondo', O.textoSecundario, O.fondo],
      ['texto secundario sobre superficie', O.textoSecundario, O.superficie],
      ['blanco sobre Secundario (botón principal)', C.sobreColor, C.secundario],
      ['violeta claro sobre superficie (precios y enlaces)', O.violetaClaro, O.superficie],
      ['violeta claro sobre fondo', O.violetaClaro, O.fondo],
      ['#1E293B sobre el Acento', C.texto, C.acento],
      ['error sobre superficie', O.error, O.superficie],
      ['éxito sobre superficie', O.exito, O.superficie],
    ];
    for (const [nombre, texto, fondo] of pares) {
      it(`${nombre} ≥ 4.5`, () => {
        expect(razonDeContraste(texto, fondo)).toBeGreaterThanOrEqual(CONTRASTE_MINIMO);
      });
    }

    it('el borde se distingue de la superficie (≠ colores iguales)', () => {
      expect(O.borde).not.toBe(O.superficie);
    });
  });
});
