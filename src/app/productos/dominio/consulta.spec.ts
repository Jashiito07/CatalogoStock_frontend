import {
  hayFiltros,
  hayMasProductos,
  LARGO_MAXIMO_BUSQUEDA,
  normalizarBusqueda,
  SIN_FILTROS,
} from './consulta';

describe('Consulta del catálogo (RF-CAT-03)', () => {
  it('normaliza la búsqueda: recorta espacios y la limita a 100 caracteres', () => {
    expect(normalizarBusqueda('  crema  ')).toBe('crema');
    expect(normalizarBusqueda('   ')).toBe('');
    expect(normalizarBusqueda('a'.repeat(150))).toHaveLength(LARGO_MAXIMO_BUSQUEDA);
  });

  it('CA-11: detecta si hay filtros activos para ofrecer «Limpiar filtros»', () => {
    expect(hayFiltros(SIN_FILTROS)).toBe(false);
    expect(hayFiltros({ ...SIN_FILTROS, busqueda: '  ' })).toBe(false);
    expect(hayFiltros({ ...SIN_FILTROS, busqueda: 'crema' })).toBe(true);
    expect(hayFiltros({ ...SIN_FILTROS, marcaId: 'm1' })).toBe(true);
    expect(hayFiltros({ ...SIN_FILTROS, disponibilidad: 'AGOTADO' })).toBe(true);
  });

  it('pide más mientras lo cargado sea menor que el total del servidor', () => {
    expect(hayMasProductos(20, 37)).toBe(true);
    expect(hayMasProductos(37, 37)).toBe(false);
    expect(hayMasProductos(0, 0)).toBe(false);
  });
});
