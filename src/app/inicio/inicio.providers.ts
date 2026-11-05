import { inject, Provider } from '@angular/core';

import { BASE_DATOS_LOCAL } from '../compartido/compartido.providers';
import { ConsultarEstadoBaseLocal } from './aplicacion/casos-uso/consultar-estado-base-local.caso-uso';

/** Casos de uso del módulo inicio, asociados a sus puertos. */
export function proveerInicio(): Provider[] {
  return [
    {
      provide: ConsultarEstadoBaseLocal,
      useFactory: () => new ConsultarEstadoBaseLocal(inject(BASE_DATOS_LOCAL)),
    },
  ];
}
