import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'CatálogoStock',
    loadComponent: () =>
      import('./inicio/presentacion/bienvenida.page').then((m) => m.BienvenidaPage),
  },
  { path: '**', redirectTo: '' },
];
