import { ConfiguracionEntorno } from '../../../environments/configuracion-entorno';

/** Lo que se necesita de `window.location` para resolver la URL de la API. */
export interface UbicacionApp {
  readonly protocol: string;
  readonly hostname: string;
}

const HOSTS_LOCALES = new Set(['', 'localhost', '127.0.0.1', '[::1]', '::1']);

type EntornoUrls = Pick<ConfiguracionEntorno, 'produccion' | 'apiEnMismoHost'>;

/**
 * Lógica común de las URL configuradas por entorno (API y panel):
 *
 * - Producción: exige HTTPS (RNF-01); si no, lanza un error.
 * - Desarrollo con `apiEnMismoHost`: si la app se abrió desde otro host (por ejemplo
 *   `http://192.168.1.20:4200` en el celular), usa ese host con el puerto y la ruta
 *   configurados.
 */
function resolverUrl(
  configurada: string,
  descripcion: string,
  entorno: EntornoUrls,
  ubicacion: UbicacionApp | null,
): string {
  const url = new URL(configurada);
  if (entorno.produccion && url.protocol !== 'https:') {
    throw new Error(`RNF-01: en producción la URL ${descripcion} debe usar HTTPS.`);
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

/** Resuelve la URL base de la API (sin barra final). */
export function resolverUrlApi(
  entorno: EntornoUrls & Pick<ConfiguracionEntorno, 'apiUrl'>,
  ubicacion: UbicacionApp | null,
): string {
  return resolverUrl(entorno.apiUrl, 'de la API', entorno, ubicacion);
}

/**
 * Resuelve la URL del panel web del Vendedor (D-37, sin barra final), con las mismas
 * reglas que la de la API: HTTPS en producción y, en desarrollo desde otro equipo, el
 * host con el que se abrió la app.
 */
export function resolverUrlPanel(
  entorno: EntornoUrls & Pick<ConfiguracionEntorno, 'urlPanel'>,
  ubicacion: UbicacionApp | null,
): string {
  return resolverUrl(entorno.urlPanel, 'del panel', entorno, ubicacion);
}
