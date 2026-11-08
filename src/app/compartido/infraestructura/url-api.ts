import { ConfiguracionEntorno } from '../../../environments/configuracion-entorno';

/** Lo que se necesita de `window.location` para resolver la URL de la API. */
export interface UbicacionApp {
  readonly protocol: string;
  readonly hostname: string;
}

const HOSTS_LOCALES = new Set(['', 'localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * Resuelve la URL base de la API (sin barra final).
 *
 * - Producción: exige HTTPS (RNF-01); si no, lanza un error y la app no arranca.
 * - Desarrollo con `apiEnMismoHost`: si la app se abrió desde otro host (por ejemplo
 *   `http://192.168.1.20:4200` en el celular), usa ese host con el puerto y la ruta de
 *   `apiUrl`.
 */
export function resolverUrlApi(
  entorno: ConfiguracionEntorno,
  ubicacion: UbicacionApp | null,
): string {
  const url = new URL(entorno.apiUrl);
  if (entorno.produccion && url.protocol !== 'https:') {
    throw new Error('RNF-01: en producción la URL de la API debe usar HTTPS.');
  }
  if (
    !entorno.produccion &&
    entorno.apiEnMismoHost &&
    ubicacion !== null &&
    (ubicacion.protocol === 'http:' || ubicacion.protocol === 'https:') &&
    !HOSTS_LOCALES.has(ubicacion.hostname)
  ) {
    url.hostname = ubicacion.hostname;
  }
  return url.toString().replace(/\/+$/u, '');
}
