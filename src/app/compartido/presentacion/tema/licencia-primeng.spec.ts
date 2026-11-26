import { opcionesLicencia } from './licencia-primeng';

// D-59: `providePrimeNG` recibe `license` solo cuando hay clave.
describe('opcionesLicencia', () => {
  it('pasa license cuando la clave no está vacía', () => {
    expect(opcionesLicencia('CLAVE-FALSA')).toEqual({ license: 'CLAVE-FALSA' });
  });

  it('no incluye license cuando la clave está vacía', () => {
    const opciones = opcionesLicencia('');
    expect(opciones).toEqual({});
    expect('license' in opciones).toBe(false);
  });
});
