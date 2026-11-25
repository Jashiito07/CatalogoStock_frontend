import { ConfiguracionEntorno } from '../../../environments/configuracion-entorno';

/** Lo que se necesita de `window.location` para resolver la URL de la API. */
export interface UbicacionApp {
  readonly protocol: string;
  readonly hostname: string;
  /** Origen de la página (`https://host:puerto`). Necesario para URL relativas. */
  readonly origin?: string;
}

const HOSTS_LOCALES = new Set(['', 'localhost', '127.0.0.1', '[::1]', '::1']);
/** Hosts en los que una URL relativa puede resolverse con HTTP aun en producción (pruebas locales). */
const HOSTS_PRUEBA_LOCAL = new Set(['localhost', '127.0.0.1']);

type EntornoUrls = Pick<ConfiguracionEntorno, 'produccion' | 'apiEnMismoHost'>;

/** Una URL relativa al origen (`/api/v1`), no a otro host (`//host/...`). */
function esRelativa(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//');
}

/**
 * Lógica común de las URL configuradas por entorno (API y panel):
 *
 * - URL relativa (`/api/v1`, demostración con un solo origen): se resuelve contra el origen
 *   de la página. Exige HTTPS en producción salvo en `localhost`/`127.0.0.1` (para probar la
 *   demostración en la propia PC).
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
  const relativa = esRelativa(configurada);
  if (relativa && (ubicacion?.origin === undefined || !/^https?:\/\//u.test(ubicacion.origin))) {
    throw new Error(
      `La URL ${descripcion} es relativa (${configurada}) y la app no se sirve por HTTP(S).`,
    );
  }
  const url = relativa ? new URL(configurada, ubicacion?.origin) : new URL(configurada);
  const excepcionLocal = relativa && HOSTS_PRUEBA_LOCAL.has(url.hostname);
  if (entorno.produccion && url.protocol !== 'https:' && !excepcionLocal) {
    throw new Error(`RNF-01: en producción la URL ${descripcion} debe usar HTTPS.`);
  }
  if (
    !relativa &&
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
 * host con el que se abrió la app. Una cadena vacía significa «sin panel» (demostración
 * por internet) y se devuelve vacía: la interfaz oculta el botón.
 */
export function resolverUrlPanel(
  entorno: EntornoUrls & Pick<ConfiguracionEntorno, 'urlPanel'>,
  ubicacion: UbicacionApp | null,
): string {
  if (entorno.urlPanel.trim() === '') return '';
  return resolverUrl(entorno.urlPanel, 'del panel', entorno, ubicacion);
}
