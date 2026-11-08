import { DOCUMENT, inject, InjectionToken, Provider } from '@angular/core';

import { environment } from '../../environments/environment';
import { BaseDatosLocal } from './aplicacion/puertos/base-datos-local.puerto';
import { Conectividad } from './aplicacion/puertos/conectividad.puerto';
import { BaseDatosSqlite } from './infraestructura/base-datos';
import { ConectividadCapacitor } from './infraestructura/conectividad-capacitor';
import { resolverUrlApi } from './infraestructura/url-api';

/** Puerto de la base de datos local; los casos de uso lo reciben por inyección. */
export const BASE_DATOS_LOCAL = new InjectionToken<BaseDatosLocal>('BASE_DATOS_LOCAL');

/** Puerto del estado de la conexión del dispositivo. */
export const CONECTIVIDAD = new InjectionToken<Conectividad>('CONECTIVIDAD');

/** URL base de la API (`…/api/v1`, sin barra final). */
export const URL_API = new InjectionToken<string>('URL_API', {
  providedIn: 'root',
  factory: () => resolverUrlApi(environment, inject(DOCUMENT).defaultView?.location ?? null),
});

/** Asocia los puertos compartidos con sus adaptadores. */
export function proveerCompartido(): Provider[] {
  return [
    { provide: BASE_DATOS_LOCAL, useExisting: BaseDatosSqlite },
    { provide: CONECTIVIDAD, useExisting: ConectividadCapacitor },
  ];
}
