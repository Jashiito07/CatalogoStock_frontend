import { inject, InjectionToken, Provider } from '@angular/core';

import { CONECTIVIDAD } from '../compartido/compartido.providers';
import { ConsultarMarcas } from './aplicacion/casos-uso/consultar-marcas.caso-uso';
import { ConsultarProductos } from './aplicacion/casos-uso/consultar-productos.caso-uso';
import { ApiProductos } from './aplicacion/puertos/api-productos.puerto';
import { ApiProductosHttp } from './infraestructura/api-productos.http';

export const API_PRODUCTOS = new InjectionToken<ApiProductos>('API_PRODUCTOS');

/** Puertos y casos de uso del módulo productos (subfase 2.7). */
export function proveerProductos(): Provider[] {
  return [
    { provide: API_PRODUCTOS, useExisting: ApiProductosHttp },
    {
      provide: ConsultarProductos,
      useFactory: () => new ConsultarProductos(inject(API_PRODUCTOS), inject(CONECTIVIDAD)),
    },
    {
      // Se conserva una sola instancia: guarda en memoria la última lista de marcas.
      provide: ConsultarMarcas,
      useFactory: () => new ConsultarMarcas(inject(API_PRODUCTOS), inject(CONECTIVIDAD)),
    },
  ];
}
