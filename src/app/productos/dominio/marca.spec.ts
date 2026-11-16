import { razonDeContraste } from '../../compartido/dominio/contraste';
import { AVON, LBEL, LEONISA, MARCAS_DE_PRUEBA, YANBAL } from '../pruebas/datos-de-prueba';
import { esMarca, esResumenMarca, textoLegibleSobre } from './marca';

describe('Marca (docs/contrato-api/productos.md, D-43)', () => {
  it('RF-CAT-05: reconoce una marca del contrato, con y sin acento', () => {
    for (const marca of MARCAS_DE_PRUEBA) expect(esMarca(marca)).toBe(true);
    expect(LEONISA.colorAcento).toBe('#F36E21');
  });

  it('rechaza colores mal formados o campos faltantes', () => {
    expect(esMarca({ ...YANBAL, color: 'naranja' })).toBe(false);
    expect(esMarca({ ...YANBAL, colorAcento: '#FFF' })).toBe(false);
    expect(esMarca({ ...YANBAL, textoSobreColor: undefined })).toBe(false);
    expect(esMarca({ ...YANBAL, activa: 'si' })).toBe(false);
    expect(esMarca({ ...YANBAL, orden: -1 })).toBe(false);
    expect(esMarca(null)).toBe(false);
    expect(esResumenMarca({ ...YANBAL, nombre: '' })).toBe(false);
  });

  it('RNF-11: usa el texto calculado por el servidor cuando cumple 4.5:1', () => {
    expect(textoLegibleSobre(AVON.color, AVON.textoSobreColor)).toBe('#0F172A');
    expect(textoLegibleSobre(LBEL.color, LBEL.textoSobreColor)).toBe('#FFFFFF');
    expect(textoLegibleSobre(LEONISA.colorAcento ?? '', LEONISA.textoSobreAcento)).toBe('#1E293B');
  });

  it('RNF-11: como respaldo recalcula si el texto del servidor no llega a 4.5:1', () => {
    // Blanco sobre Avon da 3.68:1: no sirve; se elige #0F172A como en el contrato.
    expect(textoLegibleSobre(AVON.color, '#FFFFFF')).toBe('#0F172A');
    expect(textoLegibleSobre(YANBAL.color, null)).toBe('#1E293B');
    for (const marca of MARCAS_DE_PRUEBA) {
      const texto = textoLegibleSobre(marca.color, null);
      expect(razonDeContraste(marca.color, texto)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
