import { COLORES_CORPORATIVOS, COLORES_OSCURO, TemaCatalogoStock } from './tema-catalogostock';

interface TokensColor {
  background?: string;
  color?: string;
}

/** Acceso de solo lectura a los tokens del preset, sin depender de sus tipos internos. */
function token(ruta: string): unknown {
  return ruta
    .split('.')
    .reduce<unknown>(
      (nodo, clave) => (nodo as Record<string, unknown> | undefined)?.[clave],
      TemaCatalogoStock,
    );
}

describe('TemaCatalogoStock (D-06, N2)', () => {
  it('genera la escala primaria desde el Primario en claro y en oscuro', () => {
    const valor = String(token('semantic.primary.500')).toLowerCase();
    expect(valor).toBe(COLORES_CORPORATIVOS.primario.toLowerCase());
  });

  it('el primario como texto pasa a azul claro en oscuro (D-41)', () => {
    const color = String(token('semantic.primary.color')).toLowerCase();
    expect(color).toContain(COLORES_OSCURO.azulClaro.toLowerCase());
  });

  it('esquinas muy redondeadas: botones y etiquetas en píldora, tarjetas de 26 px', () => {
    expect(token('components.button.root.borderRadius')).toBe('999px');
    expect(token('components.tag.root.borderRadius')).toBe('999px');
    expect(token('primitive.borderRadius.xl')).toBe('26px');
  });

  it('el botón principal usa texto blanco sobre el tono 500 de la escala primaria', () => {
    const principal = token('components.button.root.primary') as TokensColor;
    expect(principal.background).toBe('{primary.500}');
    expect(principal.color).toBe(COLORES_CORPORATIVOS.sobreColor);
  });

  it('usa el Secundario corporativo en los botones secundarios, con texto blanco', () => {
    const secundario = token('components.button.root.secondary') as TokensColor;
    expect(secundario.background?.toLowerCase()).toBe(
      COLORES_CORPORATIVOS.secundario.toLowerCase(),
    );
    expect(secundario.color).toBe(COLORES_CORPORATIVOS.sobreColor);
  });

  it('RNF-11: sobre el Acento el texto va en el color Texto, nunca en blanco (claro y oscuro)', () => {
    for (const ruta of ['components.badge.warn', 'components.button.root.warn']) {
      const tokens = token(ruta) as TokensColor;
      expect(tokens.background?.toLowerCase()).toBe(COLORES_CORPORATIVOS.acento.toLowerCase());
      expect(tokens.color).toBe(COLORES_CORPORATIVOS.texto);
    }
  });
});
