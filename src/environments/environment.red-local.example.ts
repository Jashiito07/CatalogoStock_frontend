import { ConfiguracionEntorno } from './configuracion-entorno';

/**
 * PLANTILLA de la configuración `red-local` (APK de desarrollo en un celular de la red
 * local). No se usa directamente.
 *
 * 1. Copia este archivo como `environment.red-local.ts` (está en .gitignore: la IP de tu
 *    PC no se versiona).
 * 2. Cambia `192.168.X.X` por la IP de tu PC en la red Wi-Fi (`ipconfig` en Windows).
 * 3. Compila con `npm run build:red-local` y ejecuta con `npm run android:red-local`.
 *
 * Solo desarrollo: usa HTTP sin cifrar. Producción exige HTTPS (RNF-01).
 */
export const environment: ConfiguracionEntorno = {
  produccion: false,
  apiUrl: 'http://192.168.X.X:3000/api/v1',
  apiEnMismoHost: false,
  // Panel del Vendedor (`npm run start:red` en CatalogoStock_admin; D-37). En el emulador
  // BlueStacks o el de Android Studio, la PC es `10.0.2.2`: usa `http://10.0.2.2:4201`
  // (y `http://10.0.2.2:3000/api/v1` en `apiUrl`).
  urlPanel: 'http://192.168.X.X:4201',
};
