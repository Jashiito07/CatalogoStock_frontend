import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ec.edu.espam.catalogostock',
  appName: 'CatálogoStock',
  webDir: 'dist/catalogostock-frontend/browser',
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
    },
  },
};

export default config;
