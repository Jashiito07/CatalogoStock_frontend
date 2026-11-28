import { resolverUrlImagen } from '../../productos/infraestructura/api-productos.http';
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
describe('URL relativa de la demostración (un solo origen)', () => {
  const demo = { produccion: true, apiUrl: '/api/v1', apiEnMismoHost: false };
  const tunel = { protocol: 'https:', hostname: 'demo.trycloudflare.com', origin: 'https://demo.trycloudflare.com' };

  it('RNF-01: se resuelve contra el origen HTTPS de la página', () => {
    expect(resolverUrlApi(demo, tunel)).toBe('https://demo.trycloudflare.com/api/v1');
  });

  it('respeta el puerto del origen', () => {
    const ubicacion = { protocol: 'https:', hostname: 'demo.ec', origin: 'https://demo.ec:8443' };
    expect(resolverUrlApi(demo, ubicacion)).toBe('https://demo.ec:8443/api/v1');
  });

  it('RNF-01: en producción rechaza un origen HTTP que no sea localhost', () => {
    const http = { protocol: 'http:', hostname: 'demo.ec', origin: 'http://demo.ec' };
    expect(() => resolverUrlApi(demo, http)).toThrow(/HTTPS/);
    const ip = { protocol: 'http:', hostname: '192.168.1.20', origin: 'http://192.168.1.20:4300' };
    expect(() => resolverUrlApi(demo, ip)).toThrow(/HTTPS/);
  });

  it('en producción admite HTTP solo en localhost y 127.0.0.1 (prueba local)', () => {
    const local = { protocol: 'http:', hostname: 'localhost', origin: 'http://localhost:4300' };
    expect(resolverUrlApi(demo, local)).toBe('http://localhost:4300/api/v1');
    const loopback = { protocol: 'http:', hostname: '127.0.0.1', origin: 'http://127.0.0.1:4310' };
    expect(resolverUrlApi(demo, loopback)).toBe('http://127.0.0.1:4310/api/v1');
  });

  it('no usa apiEnMismoHost con una URL relativa', () => {
    const entorno = { ...demo, produccion: false, apiEnMismoHost: true };
    expect(resolverUrlApi(entorno, tunel)).toBe('https://demo.trycloudflare.com/api/v1');
  });

  it('falla con claridad sin origen HTTP(S) (por ejemplo sin ubicación)', () => {
    expect(() => resolverUrlApi(demo, null)).toThrow(/relativa/);
    expect(() =>
      resolverUrlApi(demo, { protocol: 'capacitor:', hostname: 'localhost', origin: 'capacitor://localhost' }),
    ).toThrow(/relativa/);
  });

  it('una URL «//host/...» no se trata como relativa y exige HTTPS', () => {
    expect(() => resolverUrlApi({ ...demo, apiUrl: '//otro.ec/api/v1' }, tunel)).toThrow();
  });

  it('las imágenes (/api/v1/imagenes/<archivo>) se completan con el origen de la página', () => {
    const urlApi = resolverUrlApi(demo, tunel);
    expect(resolverUrlImagen(urlApi, '/api/v1/imagenes/a1.png')).toBe(
      'https://demo.trycloudflare.com/api/v1/imagenes/a1.png',
    );
  });

  it('D-37: urlPanel vacío devuelve cadena vacía (sin panel) aunque sea producción', () => {
    const entorno = { produccion: true, apiEnMismoHost: false, urlPanel: '' };
    expect(resolverUrlPanel(entorno, tunel)).toBe('');
    expect(resolverUrlPanel(entorno, null)).toBe('');
  });
});