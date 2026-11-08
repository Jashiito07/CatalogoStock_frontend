import { ConfiguracionEntorno } from './configuracion-entorno';

/**
 * Configuración de desarrollo (`npm start`). Solo la URL base de la API.
 *
 * - En la PC: `http://localhost:3000/api/v1`.
 * - En el navegador del celular (`npm run start:red-local`, app servida en
 *   `http://<IP de la PC>:4200`): `apiEnMismoHost` cambia `localhost` por la IP con la
 *   que se abrió la app, sin escribirla aquí.
 * - En el emulador de Android, `localhost` es el propio emulador: usa `10.0.2.2`.
 * - Para el APK de desarrollo en un celular, usa la configuración `red-local`
 *   (ver README).
 */
export const environment: ConfiguracionEntorno = {
  produccion: false,
  apiUrl: 'http://localhost:3000/api/v1',
  apiEnMismoHost: true,
};
