import { ConfiguracionEntorno } from './configuracion-entorno';

/**
 * Configuración «demostración» (`npm run build:demo`): la app y la API salen por UN solo
 * origen HTTPS (túnel, ver README «Demostración por internet»). `servidor-demo.mjs` sirve
 * la app y reenvía `/api/` al backend.
 *
 * - `apiUrl` relativa: se resuelve contra el origen de la página (RNF-01: el túnel es
 *   HTTPS; solo `localhost`/`127.0.0.1` admiten HTTP para probar en la PC).
 * - `urlPanel` vacío: el panel del Vendedor no se expone en la demostración (D-01, D-37).
 *
 * No es para el APK: no afecta a `cap sync` ni a la compilación de Android.
 */
export const environment: ConfiguracionEntorno = {
  produccion: true,
  apiUrl: '/api/v1',
  apiEnMismoHost: false,
  urlPanel: '',
};
