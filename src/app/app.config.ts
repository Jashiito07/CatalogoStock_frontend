import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeEsEc from '@angular/common/locales/es-EC';
import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { proveerCompartido } from './compartido/compartido.providers';
import { CLASE_TEMA_OSCURO, ServicioTema } from './compartido/presentacion/tema/servicio-tema';
import { TemaCatalogoStock } from './compartido/presentacion/tema/tema-catalogostock';
import { interceptorAutenticacion } from './usuarios/infraestructura/interceptor-autenticacion';
import { proveerUsuarios } from './usuarios/usuarios.providers';

registerLocaleData(localeEsEc);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Ionic Angular declara zone.js como dependencia par: se usa detección con zonas.
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideIonicAngular({ mode: 'md' }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(routes),
    // Token de acceso y renovación con rotación ante TOKEN_VENCIDO (D-09).
    provideHttpClient(withInterceptors([interceptorAutenticacion])),
    providePrimeNG({
      theme: {
        preset: TemaCatalogoStock,
        // Modo oscuro (N2): lo activa la clase `app-oscuro` en <html> (ServicioTema).
        options: { darkModeSelector: `.${CLASE_TEMA_OSCURO}` },
      },
      ripple: true,
    }),
    MessageService,
    // N2: el tema se aplica antes de la primera pantalla (sin destello del tema equivocado).
    provideAppInitializer(() => inject(ServicioTema).iniciar()),
    { provide: LOCALE_ID, useValue: 'es-EC' },
    proveerCompartido(),
    proveerUsuarios(),
  ],
};
