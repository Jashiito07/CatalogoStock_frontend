import { registerLocaleData } from '@angular/common';
import localeEsEc from '@angular/common/locales/es-EC';
import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { proveerCompartido } from './compartido/compartido.providers';
import { TemaCatalogoStock } from './compartido/presentacion/tema/tema-catalogostock';

registerLocaleData(localeEsEc);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Ionic Angular declara zone.js como dependencia par: se usa detección con zonas.
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideIonicAngular({ mode: 'md' }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(routes),
    providePrimeNG({
      theme: {
        preset: TemaCatalogoStock,
        // Solo tema claro: el contraste de RNF-11 se validó sobre el Fondo corporativo.
        options: { darkModeSelector: false },
      },
      ripple: true,
    }),
    MessageService,
    { provide: LOCALE_ID, useValue: 'es-EC' },
    proveerCompartido(),
  ],
};
