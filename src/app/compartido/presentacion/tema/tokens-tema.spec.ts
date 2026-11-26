import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { CONTRASTE_MINIMO, razonDeContraste } from '../../dominio/contraste';
import { COLORES_CORPORATIVOS as C, COLORES_OSCURO as O } from './tema-catalogostock';

/** Contraste mínimo de elementos no textuales (WCAG 1.4.11): bordes de controles y gráficos. */
const CONTRASTE_NO_TEXTUAL = 3;

const RAIZ = resolve(process.cwd(), 'src');
const RUTA_TEMA = join(RAIZ, 'app', 'compartido', 'presentacion', 'tema');

const sinComentarios = (texto: string) => texto.replace(/\/\*[\s\S]*?\*\//g, '');

type Tokens = Map<string, string>;

/** Declaraciones `--nombre: valor;` del bloque que empieza en `selector {`. */
function leerBloque(css: string, selector: string): Tokens {
  const inicio = css.indexOf(`${selector} {`);
  if (inicio < 0) throw new Error(`No existe el bloque ${selector}`);
  const cuerpo = css.slice(css.indexOf('{', inicio) + 1, css.indexOf('}', inicio));
  const tokens: Tokens = new Map();
  for (const [, nombre, valor] of cuerpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(nombre!, valor!.trim());
  }
  return tokens;
}

const css = sinComentarios(readFileSync(join(RUTA_TEMA, 'colores.css'), 'utf8'));
const claro = leerBloque(css, ':root');
const oscuro: Tokens = new Map([...claro, ...leerBloque(css, ':root.app-oscuro')]);

/** Valor final de un token en un tema, resolviendo `var(--otro)`. */
function valor(tema: Tokens, nombre: string): string {
  const crudo = tema.get(nombre);
  if (crudo === undefined) throw new Error(`Falta el token ${nombre}`);
  const alias = /^var\((--[\w-]+)\)$/.exec(crudo);
  return alias ? valor(tema, alias[1]!) : crudo.toUpperCase();
}

const TEMAS: [string, Tokens][] = [
  ['claro', claro],
  ['oscuro', oscuro],
];

/** [descripción, texto, fondo]: texto normal, mínimo 4.5:1 (RNF-11). */
const PARES_TEXTO: [string, string, string][] = [
  ['texto sobre fondo', '--cs-texto', '--cs-fondo'],
  ['texto sobre superficie', '--cs-texto', '--cs-sup'],
  ['texto sobre superficie secundaria', '--cs-texto', '--cs-sup2'],
  ['texto secundario sobre fondo', '--cs-texto2', '--cs-fondo'],
  ['texto secundario sobre superficie', '--cs-texto2', '--cs-sup'],
  ['texto secundario sobre superficie secundaria', '--cs-texto2', '--cs-sup2'],
  ['primario como texto sobre fondo', '--cs-pri-t', '--cs-fondo'],
  ['primario como texto sobre superficie', '--cs-pri-t', '--cs-sup'],
  ['primario como texto sobre superficie secundaria', '--cs-pri-t', '--cs-sup2'],
  ['secundario como texto sobre fondo', '--cs-sec-t', '--cs-fondo'],
  ['secundario como texto sobre superficie', '--cs-sec-t', '--cs-sup'],
  ['blanco sobre botón primario', '--cs-sobre-pri', '--cs-pri'],
  ['blanco sobre secundario', '--cs-sobre-sec', '--cs-sec'],
  ['#1E293B sobre el Acento', '--cs-sobre-acento', '--cs-acento'],
  ['etiqueta de sección (kicker) sobre fondo', '--cs-kick', '--cs-fondo'],
  ['etiqueta de sección (kicker) sobre superficie', '--cs-kick', '--cs-sup'],
  ['menú lateral: texto sobre barra', '--cs-lat-t', '--cs-lat'],
  ['menú lateral: texto activo', '--cs-sobre-pri', '--cs-lat-on'],
  ['etiqueta Disponible', '--cs-ok', '--cs-ok-bg'],
  ['etiqueta Pendiente de reposición', '--cs-warn', '--cs-warn-bg'],
  ['etiqueta Agotado o error', '--cs-mal', '--cs-mal-bg'],
  ['etiqueta informativa', '--cs-info', '--cs-info-bg'],
  ['Yanbal', '--cs-marca-yanbal-texto', '--cs-marca-yanbal'],
  ['Avon', '--cs-marca-avon-texto', '--cs-marca-avon'],
  ["L'Bel", '--cs-marca-lbel-texto', '--cs-marca-lbel'],
  ['Cyzone', '--cs-marca-cyzone-texto', '--cs-marca-cyzone'],
  ['Esika', '--cs-marca-esika-texto', '--cs-marca-esika'],
  ['Leonisa (principal)', '--cs-marca-leonisa-texto', '--cs-marca-leonisa'],
  ['Leonisa (acento)', '--cs-marca-leonisa-texto-acento', '--cs-marca-leonisa-acento'],
];

/** [descripción, color, fondo]: elementos no textuales, mínimo 3:1. */
const PARES_NO_TEXTUALES: [string, string, string][] = [
  ['borde de controles sobre superficie', '--cs-ctl', '--cs-sup'],
  ['borde de controles sobre fondo', '--cs-ctl', '--cs-fondo'],
  ...[1, 2, 3, 4, 5, 6].map(
    (n): [string, string, string] => [`gráfico ${n} sobre superficie`, `--cs-g${n}`, '--cs-sup'],
  ),
];

/** RNF-11: contraste de los tokens REALES de `colores.css`, en claro y en oscuro. */
describe('Contraste de los tokens de colores.css (RNF-11)', () => {
  for (const [nombreTema, tema] of TEMAS) {
    describe(`tema ${nombreTema}`, () => {
      for (const [descripcion, texto, fondo] of PARES_TEXTO) {
        it(`${descripcion} ≥ 4.5`, () => {
          expect(razonDeContraste(valor(tema, texto), valor(tema, fondo))).toBeGreaterThanOrEqual(
            CONTRASTE_MINIMO,
          );
        });
      }

      for (const [descripcion, color, fondo] of PARES_NO_TEXTUALES) {
        it(`${descripcion} ≥ 3 (no textual)`, () => {
          expect(razonDeContraste(valor(tema, color), valor(tema, fondo))).toBeGreaterThanOrEqual(
            CONTRASTE_NO_TEXTUAL,
          );
        });
      }

      it('el blanco sobre el Acento NO cumple (por eso el texto del Acento es #1E293B)', () => {
        expect(razonDeContraste('#FFFFFF', valor(tema, '--cs-acento'))).toBeLessThan(
          CONTRASTE_MINIMO,
        );
      });

    });
  }

  it('en claro el Acento no sirve como texto sobre el fondo (por eso existe --cs-kick)', () => {
    expect(razonDeContraste(valor(claro, '--cs-acento'), valor(claro, '--cs-fondo'))).toBeLessThan(
      CONTRASTE_MINIMO,
    );
  });
});

/** D-06: una sola definición. El preset de PrimeNG y `colores.css` deben coincidir. */
describe('Coherencia entre colores.css y el preset de PrimeNG (D-06)', () => {
  it('colores corporativos (claro)', () => {
    expect(valor(claro, '--cs-pri')).toBe(C.primario);
    expect(valor(claro, '--cs-sec')).toBe(C.secundario);
    expect(valor(claro, '--cs-acento')).toBe(C.acento);
    expect(valor(claro, '--cs-fondo')).toBe(C.fondo);
    expect(valor(claro, '--cs-texto')).toBe(C.texto);
    expect(valor(claro, '--cs-sobre-pri')).toBe(C.sobreColor);
    expect(valor(claro, '--cs-sobre-acento')).toBe(C.texto);
  });

  it('colores del modo oscuro', () => {
    expect(valor(oscuro, '--cs-fondo')).toBe(O.fondo);
    expect(valor(oscuro, '--cs-sup')).toBe(O.superficie);
    expect(valor(oscuro, '--cs-sup2')).toBe(O.superficie2);
    expect(valor(oscuro, '--cs-borde')).toBe(O.borde);
    expect(valor(oscuro, '--cs-texto')).toBe(O.texto);
    expect(valor(oscuro, '--cs-texto2')).toBe(O.textoSecundario);
    expect(valor(oscuro, '--cs-pri-t')).toBe(O.azulClaro);
    expect(valor(oscuro, '--cs-sec-t')).toBe(O.violetaClaro);
  });

  it('el primario y el secundario conservan su fondo de acción en el modo oscuro', () => {
    expect(valor(oscuro, '--cs-pri')).toBe(C.primario);
    expect(valor(oscuro, '--cs-sec')).toBe(C.secundario);
  });

  it('los nombres anteriores siguen disponibles (alias)', () => {
    for (const nombre of [
      '--cs-primario',
      '--cs-secundario',
      '--cs-superficie',
      '--cs-texto-secundario',
      '--cs-disponible-fondo',
      '--cs-disponible-texto',
      '--cs-pendiente-fondo',
      '--cs-pendiente-texto',
    ]) {
      expect(claro.has(nombre)).toBe(true);
    }
  });
});

describe('Forma, tamaño táctil y tipografía', () => {
  it('RNF-10: el tamaño táctil mínimo es de al menos 44 px', () => {
    expect(parseInt(valor(claro, '--cs-tactil-minimo'), 10)).toBeGreaterThanOrEqual(44);
    expect(parseInt(valor(claro, '--cs-control-minimo'), 10)).toBeGreaterThanOrEqual(44);
  });

  it('la serifa es solo de títulos: la fuente del cuerpo es sans-serif y sin recursos remotos', () => {
    expect(claro.get('--cs-fuente')).toContain('system-ui');
    expect(claro.get('--cs-fuente-titulo')).toContain('serif');
    expect(css).not.toMatch(/@import|@font-face|url\(/);
  });

  it('esquinas muy redondeadas', () => {
    expect(parseInt(valor(claro, '--cs-radio-tarjeta'), 10)).toBeGreaterThanOrEqual(24);
    expect(parseInt(valor(claro, '--cs-radio-hoja'), 10)).toBeGreaterThanOrEqual(32);
  });
});

/** Todos los archivos con la extensión dada bajo `src`, fuera de la carpeta de los tokens. */
function archivos(extensiones: string[], dir = RAIZ): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) return archivos(extensiones, ruta);
    return extensiones.some((e) => entrada.name.endsWith(e)) ? [ruta] : [];
  });
}

describe('Estilos de la app (D-06)', () => {
  const estilos = archivos(['.scss', '.css', '.html']);
  const componentes = [...estilos, ...archivos(['.component.ts', '.page.ts'])].filter(
    (ruta) => !ruta.startsWith(RUTA_TEMA) && !ruta.endsWith('.spec.ts'),
  );

  it('encuentra los estilos y los componentes', () => {
    expect(estilos.length).toBeGreaterThan(5);
    expect(componentes.length).toBeGreaterThan(5);
  });

  it('los componentes no escriben colores hexadecimales: usan variables --cs-*', () => {
    const infractores = componentes.filter((ruta) =>
      /#[0-9a-fA-F]{3,8}\b/.test(sinComentarios(readFileSync(ruta, 'utf8'))),
    );
    expect(infractores).toEqual([]);
  });

  it('ningún estilo usa backdrop-filter (rendimiento en Android de gama baja)', () => {
    const infractores = estilos.filter((ruta) =>
      sinComentarios(readFileSync(ruta, 'utf8')).includes('backdrop-filter'),
    );
    expect(infractores).toEqual([]);
  });

  it('las animaciones se apagan con prefers-reduced-motion', () => {
    const utilidades = readFileSync(join(RUTA_TEMA, 'utilidades.css'), 'utf8');
    expect(utilidades).toContain('@media (prefers-reduced-motion: reduce)');
    expect(utilidades).toMatch(/animation-duration:\s*0\.01ms/);
    expect(utilidades).toMatch(/transition-duration:\s*0\.01ms/);
  });

  it('las clases compartidas usan solo variables y existen las de las etapas siguientes', () => {
    const utilidades = sinComentarios(readFileSync(join(RUTA_TEMA, 'utilidades.css'), 'utf8'));
    for (const clase of [
      '.cs-tarjeta',
      '.cs-chip',
      '.cs-etiqueta',
      '.cs-etiqueta--ok',
      '.cs-etiqueta--warn',
      '.cs-etiqueta--mal',
      '.cs-hoja',
      '.cs-banda-marca',
      '.cs-circulo-marca',
      '.cs-marca--leonisa',
    ]) {
      expect(utilidades).toContain(`${clase} {`);
    }
  });
});
