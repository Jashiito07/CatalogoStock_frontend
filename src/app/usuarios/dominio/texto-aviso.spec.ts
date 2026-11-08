import { interpretarTextoAviso, segmentarNegritas } from './texto-aviso';

describe('Texto del aviso de privacidad (RNF-16, D-15)', () => {
  it('convierte títulos, párrafos y listas en bloques', () => {
    const bloques = interpretarTextoAviso(
      [
        'PROVISIONAL - revisar antes de publicar',
        '',
        '# Aviso de privacidad',
        '',
        'Primera línea',
        'segunda línea.',
        '',
        '## 2. Datos',
        '',
        '- **Cuenta:** nombre y correo.',
        '- Pedidos.',
      ].join('\n'),
    );

    expect(bloques).toEqual([
      { tipo: 'parrafo', segmentos: [{ texto: 'PROVISIONAL - revisar antes de publicar', negrita: false }] },
      { tipo: 'titulo', nivel: 1, segmentos: [{ texto: 'Aviso de privacidad', negrita: false }] },
      { tipo: 'parrafo', segmentos: [{ texto: 'Primera línea segunda línea.', negrita: false }] },
      { tipo: 'titulo', nivel: 2, segmentos: [{ texto: '2. Datos', negrita: false }] },
      {
        tipo: 'lista',
        elementos: [
          [
            { texto: 'Cuenta:', negrita: true },
            { texto: ' nombre y correo.', negrita: false },
          ],
          [{ texto: 'Pedidos.', negrita: false }],
        ],
      },
    ]);
  });

  it('no interpreta HTML: el texto queda tal cual para pintarlo como texto', () => {
    const bloques = interpretarTextoAviso('<script>alert(1)</script>');
    expect(bloques).toEqual([
      { tipo: 'parrafo', segmentos: [{ texto: '<script>alert(1)</script>', negrita: false }] },
    ]);
  });

  it('deja como texto normal una negrita sin cerrar', () => {
    expect(segmentarNegritas('hola **mundo')).toEqual([{ texto: 'hola **mundo', negrita: false }]);
  });
});
