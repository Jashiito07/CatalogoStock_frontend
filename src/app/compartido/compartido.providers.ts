import { InjectionToken, Provider } from '@angular/core';

import { BaseDatosLocal } from './aplicacion/puertos/base-datos-local.puerto';
import { BaseDatosSqlite } from './infraestructura/base-datos';

/** Puerto de la base de datos local; los casos de uso lo reciben por inyección. */
export const BASE_DATOS_LOCAL = new InjectionToken<BaseDatosLocal>('BASE_DATOS_LOCAL');

/** Asocia los puertos compartidos con sus adaptadores. */
export function proveerCompartido(): Provider[] {
  return [{ provide: BASE_DATOS_LOCAL, useExisting: BaseDatosSqlite }];
}
