import { definePreset, palette } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Tema corporativo de CatálogoStock (D-06). Único lugar, junto con `colores.css`,
 * donde se escriben los colores en hexadecimal.
 *
 * Modo claro:
 * | Rol        | Color     |
 * |------------|-----------|
 * | Primario   | #2563EB   |
 * | Secundario | #7C3AED   |
 * | Acento     | #F97316   |
 * | Fondo      | #F8FAFC   |
 * | Texto      | #1E293B   |
 *
 * Modo oscuro (D-41; rediseño, etapa 1, maqueta «Combinada»): fondo #0F172A, superficies
 * #1E293B y #273449, bordes #334155, texto #F1F5F9 y #CBD5E1. El Primario sigue siendo el
 * fondo de las acciones (texto blanco) y pasa a #60A5FA como texto o enlace; el Secundario
 * (violeta) queda de apoyo y su tono claro #A78BFA sirve como texto.
 *
 * PrimeNG (Aura) resuelve ambos modos con `light-dark()`: la clase de `darkModeSelector`
 * (`app-oscuro`) fija `color-scheme: dark` y cada token usa su valor oscuro.
 *
 * Forma: esquinas muy redondeadas (controles 14 px, tarjetas 26 px, botones y etiquetas en
 * píldora) y sombras suaves (`--cs-sombra`). Sin vidrio translúcido.
 *
 * Contraste (RNF-11): sobre el Acento el texto va en el color Texto, nunca en blanco.
 * Las escalas (50…950) se generan con `palette()`; el tono 500 es el color corporativo
 * y de las demás salen los estados hover, focus y activo. Los valores fijos de este archivo
 * deben coincidir con `colores.css` (lo comprueba `tokens-tema.spec.ts`).
 */
export const COLORES_CORPORATIVOS = {
  primario: '#2563EB',
  secundario: '#7C3AED',
  acento: '#F97316',
  fondo: '#F8FAFC',
  texto: '#1E293B',
  sobreColor: '#FFFFFF',
} as const;

/** Paleta del modo oscuro (maqueta «Combinada»). */
export const COLORES_OSCURO = {
  fondo: '#0F172A',
  superficie: '#1E293B',
  superficie2: '#273449',
  borde: '#334155',
  texto: '#F1F5F9',
  textoSecundario: '#CBD5E1',
  /** Primario como texto, enlace o ícono sobre oscuro. */
  azulClaro: '#60A5FA',
  /** Tono claro del Secundario para texto y enlaces. */
  violetaClaro: '#A78BFA',
  /** Estados legibles sobre oscuro: error (rojo 300) y éxito (verde 300) de PrimeNG. */
  error: '#FCA5A5',
  exito: '#86EFAC',
} as const;

const TONOS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
type Tono = (typeof TONOS)[number];
type Escala = Record<Tono, string>;

function escalaDe(color: string): Escala {
  const escala = palette(color);
  return Object.fromEntries(
    TONOS.map((tono) => {
      const valor = escala[tono];
      if (!valor) {
        throw new Error(`No se generó el tono ${tono} de ${color}`);
      }
      return [tono, valor];
    }),
  ) as Escala;
}

const primario = escalaDe(COLORES_CORPORATIVOS.primario);
const secundario = escalaDe(COLORES_CORPORATIVOS.secundario);
const acento = escalaDe(COLORES_CORPORATIVOS.acento);
const { texto, sobreColor } = COLORES_CORPORATIVOS;

/** Valor `claro` en modo claro y `oscuro` en modo oscuro (CSS `light-dark()`). */
const segunModo = (claro: string, oscuro: string) => `light-dark(${claro}, ${oscuro})`;

/** Fondo de las acciones y de los controles marcados: Primario (azul) en ambos modos. */
const escalaPrimaria: Escala = primario;

/** Esquinas del rediseño (maqueta «Combinada»); las tarjetas usan 26 px y la hoja 34 px. */
const RADIO_PILDORA = '999px';
const BORDE_REDONDEADO = {
  none: '0',
  xs: '6px',
  sm: '10px',
  md: '14px',
  lg: '18px',
  xl: '26px',
} as const;

const superficies = Object.fromEntries(
  TONOS.map((tono) => [tono, `{slate.${tono}}`]),
) as Escala;

type Estado = 'blue' | 'green' | 'yellow' | 'red';

/**
 * Texto de un estado (info, éxito, advertencia, error). En claro, tono 600 para azul y
 * 700 para verde, amarillo y rojo (el 600 de estos queda en 2.8–4.4:1 sobre su fondo
 * tintado); en oscuro, tono 300 (el 500 de Aura no llega a 4.5:1). RNF-11: ≥ 4.5:1.
 */
const TONO_ESTADO_CLARO: Record<Estado, 600 | 700> = {
  blue: 600,
  green: 700,
  yellow: 700,
  red: 700,
};
const textoEstado = (color: Estado) =>
  segunModo(`{${color}.${TONO_ESTADO_CLARO[color]}}`, `{${color}.300}`);

const ESTADOS: Record<'info' | 'success' | 'warn' | 'error', Estado> = {
  info: 'blue',
  success: 'green',
  warn: 'yellow',
  error: 'red',
};

/** Tokens de texto de `message` y `toast` para los cuatro estados. */
const mensajesLegibles = Object.fromEntries(
  Object.entries(ESTADOS).map(([severidad, color]) => [
    severidad,
    {
      color: textoEstado(color),
      outlined: { color: textoEstado(color) },
      simple: { color: textoEstado(color) },
    },
  ]),
);

const avisosLegibles = Object.fromEntries(
  Object.entries(ESTADOS).map(([severidad, color]) => [severidad, { color: textoEstado(color) }]),
);

export const TemaCatalogoStock = definePreset(Aura, {
  primitive: {
    borderRadius: BORDE_REDONDEADO,
  },
  semantic: {
    // Superficies: escala slate en ambos modos (Aura usa zinc en oscuro).
    surface: { 0: '#ffffff', ...superficies },
    // Velo detrás de la hoja inferior y de los diálogos (`--cs-velo`).
    mask: { background: 'var(--cs-velo)', color: '{surface.0}' },
    primary: {
      ...escalaPrimaria,
      // Como texto o enlace: azul 500 en claro; azul claro (#60A5FA) en oscuro.
      color: segunModo('{primary.500}', COLORES_OSCURO.azulClaro),
      contrastColor: segunModo(sobreColor, COLORES_OSCURO.fondo),
      hoverColor: segunModo('{primary.600}', '{primary.300}'),
      activeColor: segunModo('{primary.700}', '{primary.200}'),
    },
    text: {
      color: segunModo(texto, COLORES_OSCURO.texto),
      // Tono 600: sobre la superficie secundaria el 500 queda en 4.3:1 (RNF-11).
      mutedColor: segunModo('{surface.600}', COLORES_OSCURO.textoSecundario),
    },
    content: {
      background: segunModo('{surface.0}', COLORES_OSCURO.superficie),
      hoverBackground: segunModo('{surface.100}', COLORES_OSCURO.superficie2),
      borderColor: segunModo('{surface.200}', COLORES_OSCURO.borde),
    },
    overlay: {
      select: {
        background: segunModo('{surface.0}', COLORES_OSCURO.superficie),
        borderColor: segunModo('{surface.200}', COLORES_OSCURO.borde),
      },
      popover: {
        background: segunModo('{surface.0}', COLORES_OSCURO.superficie),
        borderColor: segunModo('{surface.200}', COLORES_OSCURO.borde),
      },
      modal: {
        background: segunModo('{surface.0}', COLORES_OSCURO.superficie),
        borderColor: segunModo('{surface.200}', COLORES_OSCURO.borde),
      },
    },
    formField: {
      // Campos más oscuros que la tarjeta que los contiene.
      background: segunModo('{surface.0}', COLORES_OSCURO.fondo),
      filledBackground: segunModo('{surface.50}', COLORES_OSCURO.fondo),
      filledHoverBackground: segunModo('{surface.50}', COLORES_OSCURO.fondo),
      filledFocusBackground: segunModo('{surface.50}', COLORES_OSCURO.fondo),
      // Borde de los campos con al menos 3:1 (no textual): `--cs-ctl`.
      borderColor: segunModo('{surface.500}', '{surface.400}'),
      hoverBorderColor: segunModo('{surface.600}', '{surface.300}'),
    },
  },
  components: {
    button: {
      root: {
        // Botones en píldora (maqueta «Combinada»).
        borderRadius: RADIO_PILDORA,
        // Principal: Primario (azul) con texto blanco en claro y en oscuro (5.17:1).
        primary: {
          background: '{primary.500}',
          hoverBackground: '{primary.600}',
          activeBackground: '{primary.700}',
          borderColor: '{primary.500}',
          hoverBorderColor: '{primary.600}',
          activeBorderColor: '{primary.700}',
          color: sobreColor,
          hoverColor: sobreColor,
          activeColor: sobreColor,
        },
        // Secundario: violeta con texto blanco en ambos modos (5.70:1).
        secondary: {
          background: secundario[500],
          hoverBackground: secundario[600],
          activeBackground: secundario[700],
          borderColor: secundario[500],
          hoverBorderColor: secundario[600],
          activeBorderColor: secundario[700],
          color: sobreColor,
          hoverColor: sobreColor,
          activeColor: sobreColor,
          focusRing: { color: segunModo(secundario[500], secundario[300]), shadow: 'none' },
        },
        // El Acento lleva texto oscuro: el blanco sobre naranja no cumple 4.5:1.
        warn: {
          background: acento[500],
          hoverBackground: acento[400],
          activeBackground: acento[300],
          borderColor: acento[500],
          hoverBorderColor: acento[400],
          activeBorderColor: acento[300],
          color: texto,
          hoverColor: texto,
          activeColor: texto,
          focusRing: { color: acento[500], shadow: 'none' },
        },
      },
      outlined: {
        // Borde y texto con al menos 3:1 (los chips de filtro son botones con contorno).
        primary: {
          borderColor: segunModo('{primary.500}', COLORES_OSCURO.azulClaro),
          color: segunModo('{primary.500}', COLORES_OSCURO.azulClaro),
        },
        secondary: {
          hoverBackground: segunModo(
            secundario[50],
            `color-mix(in srgb, ${secundario[400]}, transparent 88%)`,
          ),
          activeBackground: segunModo(
            secundario[100],
            `color-mix(in srgb, ${secundario[400]}, transparent 76%)`,
          ),
          borderColor: segunModo(secundario[500], secundario[400]),
          color: segunModo(secundario[500], COLORES_OSCURO.violetaClaro),
        },
      },
      text: {
        secondary: {
          hoverBackground: segunModo(
            secundario[50],
            `color-mix(in srgb, ${secundario[400]}, transparent 88%)`,
          ),
          activeBackground: segunModo(
            secundario[100],
            `color-mix(in srgb, ${secundario[400]}, transparent 76%)`,
          ),
          color: segunModo(secundario[500], COLORES_OSCURO.violetaClaro),
        },
      },
    },
    // Botones segmentados (selector de tema): la opción activa es violeta en oscuro.
    togglebutton: {
      root: {
        background: segunModo('{surface.100}', COLORES_OSCURO.fondo),
        checkedBackground: segunModo('{surface.100}', COLORES_OSCURO.fondo),
        hoverBackground: segunModo('{surface.100}', COLORES_OSCURO.fondo),
        borderColor: segunModo('{surface.100}', COLORES_OSCURO.borde),
        checkedBorderColor: segunModo('{surface.100}', COLORES_OSCURO.borde),
        // Tono 600 (no el 500 de Aura): sobre surface.100 el 500 queda en 4.3:1 (RNF-11).
        color: segunModo('{surface.600}', COLORES_OSCURO.textoSecundario),
        hoverColor: segunModo('{surface.700}', COLORES_OSCURO.texto),
        checkedColor: segunModo('{surface.900}', sobreColor),
      },
      icon: {
        color: segunModo('{surface.600}', COLORES_OSCURO.textoSecundario),
        hoverColor: segunModo('{surface.700}', COLORES_OSCURO.texto),
        checkedColor: segunModo('{surface.900}', sobreColor),
      },
      content: {
        checkedBackground: segunModo('{surface.0}', secundario[500]),
      },
    },
    message: mensajesLegibles,
    toast: avisosLegibles,
    // Tarjetas muy redondeadas con sombra suave (la misma de `.cs-tarjeta`).
    card: {
      root: {
        borderRadius: '{border.radius.xl}',
        shadow: 'var(--cs-sombra)',
      },
    },
    // Etiquetas de estado en píldora (siempre con texto e ícono).
    tag: {
      root: {
        borderRadius: RADIO_PILDORA,
      },
      colorScheme: {
        // Etiqueta neutra («Cliente»): superficie secundaria con texto de 4.5:1 o más.
        light: { secondary: { background: '{surface.100}', color: '{surface.700}' } },
        dark: {
          secondary: {
            background: COLORES_OSCURO.superficie2,
            color: COLORES_OSCURO.textoSecundario,
          },
        },
      },
    },
    badge: {
      secondary: {
        background: secundario[500],
        color: sobreColor,
      },
      // Insignias destacadas (contador del carrito, ofertas): Acento con texto oscuro.
      warn: {
        background: acento[500],
        color: texto,
      },
    },
  },
});
