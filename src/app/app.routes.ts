import { Routes } from '@angular/router';

import { conSesionGuard, sinSesionGuard } from './usuarios/presentacion/guards-sesion';

/**
 * Rutas de la app del Cliente. PA-12: sin sesión solo se ven Bienvenida, Registro,
 * Ingreso y Recuperar clave (RF-USU-05); el resto exige sesión (también guardada y sin
 * conexión, D-10).
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'bienvenida',
    title: 'CatálogoStock',
    canActivate: [sinSesionGuard],
    loadComponent: () =>
      import('./inicio/presentacion/bienvenida.page').then((m) => m.BienvenidaPage),
  },
  {
    path: 'registro',
    title: 'Crear cuenta · CatálogoStock',
    canActivate: [sinSesionGuard],
    loadComponent: () =>
      import('./usuarios/presentacion/registro.page').then((m) => m.RegistroPage),
  },
  {
    path: 'ingreso',
    title: 'Iniciar sesión · CatálogoStock',
    canActivate: [sinSesionGuard],
    loadComponent: () =>
      import('./usuarios/presentacion/ingreso.page').then((m) => m.IngresoPage),
  },
  {
    // RF-USU-05: pública (sin sesión), con el código que genera el Vendedor.
    path: 'recuperar-clave',
    title: 'Recuperar clave · CatálogoStock',
    canActivate: [sinSesionGuard],
    loadComponent: () =>
      import('./usuarios/presentacion/recuperar-clave.page').then((m) => m.RecuperarClavePage),
  },
  {
    // RF-USU-05: cambio de clave con la sesión iniciada.
    path: 'cambiar-clave',
    title: 'Cambiar mi clave · CatálogoStock',
    canActivate: [conSesionGuard],
    loadComponent: () =>
      import('./usuarios/presentacion/cambiar-clave.page').then((m) => m.CambiarClavePage),
  },
  {
    path: 'inicio',
    title: 'Inicio · CatálogoStock',
    canActivate: [conSesionGuard],
    loadComponent: () =>
      import('./inicio/presentacion/inicio-cliente.page').then((m) => m.InicioClientePage),
  },
  { path: '**', redirectTo: 'inicio' },
];
