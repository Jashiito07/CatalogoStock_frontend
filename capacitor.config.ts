import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Compilación de desarrollo en la red local (`npm run android:red-local`, ver README).
 *
 * Solo cuando la variable `CS_RED_LOCAL=1` está definida al ejecutar `cap sync` o
 * `cap run`, el WebView sirve la app desde `http://localhost` (en vez de
 * `https://localhost`) y Android permite HTTP sin cifrar, para hablar con la API de la PC
 * (`http://<IP>:3000`). Sin la variable, la configuración es la segura de siempre:
 * producción exige HTTPS (RNF-01) y `android/app/build.gradle` impide compilar un
 * release con HTTP sin cifrar.
 */
const redLocal = process.env['CS_RED_LOCAL'] === '1';

const config: CapacitorConfig = {
  appId: 'ec.edu.espam.catalogostock',
  appName: 'CatálogoStock',
  webDir: 'dist/catalogostock-frontend/browser',
  ...(redLocal ? { server: { androidScheme: 'http', cleartext: true } } : {}),
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
    },
  },
};

export default config;
