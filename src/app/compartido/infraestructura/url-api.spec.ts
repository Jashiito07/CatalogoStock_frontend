import { resolverUrlApi, resolverUrlPanel } from './url-api';

const desarrollo = {
  produccion: false,
  apiUrl: 'http://localhost:3000/api/v1',
  apiEnMismoHost: true,
};

describe('URL de la API', () => {
  it('en la PC usa la URL configurada', () => {
    expect(resolverUrlApi(desarrollo, { protocol: 'http:', hostname: 'localhost' })).toBe(
      'http://localhost:3000/api/v1',
    );
  });

  it('en el navegador del celular usa el mismo host que sirve la app, con el puerto de la API', () => {
    expect(resolverUrlApi(desarrollo, { protocol: 'http:', hostname: '192.168.100.113' })).toBe(
      'http://192.168.100.113:3000/api/v1',
    );
  });

  it('no cambia el host si la opción está desactivada (APK red-local)', () => {
    const redLocal = { ...desarrollo, apiUrl: 'http://192.168.1.20:3000/api/v1', apiEnMismoHost: false };
    expect(resolverUrlApi(redLocal, { protocol: 'http:', hostname: 'localhost' })).toBe(
      'http://192.168.1.20:3000/api/v1',
    );
  });

  it('no cambia el host en un esquema propio de Capacitor', () => {
    expect(resolverUrlApi(desarrollo, { protocol: 'capacitor:', hostname: 'localhost' })).toBe(
      'http://localhost:3000/api/v1',
    );
  });

  it('RNF-01: en producción exige HTTPS y nunca cambia el host', () => {
    const produccion = { produccion: true, apiUrl: 'https://api.ejemplo.ec/api/v1', apiEnMismoHost: true };
    expect(resolverUrlApi(produccion, { protocol: 'http:', hostname: '10.0.0.5' })).toBe(
      'https://api.ejemplo.ec/api/v1',
    );
    expect(() =>
      resolverUrlApi({ ...produccion, apiUrl: 'http://api.ejemplo.ec/api/v1' }, null),
    ).toThrow(/HTTPS/);
  });
});

describe('URL del panel del Vendedor (D-37)', () => {
  const entorno = { produccion: false, apiEnMismoHost: true, urlPanel: 'http://localhost:4201' };

  it('en la PC usa la URL configurada, sin barra final', () => {
    expect(resolverUrlPanel(entorno, { protocol: 'http:', hostname: 'localhost' })).toBe(
      'http://localhost:4201',
    );
  });

  it('en el navegador del celular usa el host que sirve la app, igual que la API', () => {
    expect(resolverUrlPanel(entorno, { protocol: 'http:', hostname: '192.168.100.113' })).toBe(
      'http://192.168.100.113:4201',
    );
  });

  it('APK red-local / BlueStacks: respeta la URL configurada (10.0.2.2)', () => {
    const redLocal = { ...entorno, apiEnMismoHost: false, urlPanel: 'http://10.0.2.2:4201' };
    expect(resolverUrlPanel(redLocal, { protocol: 'http:', hostname: 'localhost' })).toBe(
      'http://10.0.2.2:4201',
    );
  });

  it('RNF-01: en producción exige HTTPS', () => {
    const produccion = { produccion: true, apiEnMismoHost: false, urlPanel: 'https://panel.ejemplo.ec' };
    expect(resolverUrlPanel(produccion, null)).toBe('https://panel.ejemplo.ec');
    expect(() => resolverUrlPanel({ ...produccion, urlPanel: 'http://panel.ejemplo.ec' }, null)).toThrow(
      /HTTPS/,
    );
  });
});