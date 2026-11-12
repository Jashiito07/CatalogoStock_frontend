import { DOCUMENT, inject, InjectionToken, Provider } from '@angular/core';

import { environment } from '../../environments/environment';
import { BaseDatosLocal } from './aplicacion/puertos/base-datos-local.puerto';
import { Conectividad } from './aplicacion/puertos/conectividad.puerto';
import { BaseDatosSqlite } from './infraestructura/base-datos';
import { BarraEstadoCapacitor } from './infraestructura/barra-estado-capacitor';
import { ConectividadCapacitor } from './infraestructura/conectividad-capacitor';
import { PreferenciaTemaSqlite } from './infraestructura/preferencia-tema.sqlite';
import { resolverUrlApi, resolverUrlPanel } from './infraestructura/url-api';
import { ALMACEN_PREFERENCIA_TEMA, BARRA_ESTADO } from './presentacion/tema/servicio-tema';

/** Puerto de la base de datos local; los casos de uso lo reciben por inyección. */
export const BASE_DATOS_LOCAL = new InjectionToken<BaseDatosLocal>('BASE_DATOS_LOCAL');

/** Puerto del estado de la conexión del dispositivo. */
export const CONECTIVIDAD = new InjectionToken<Conectividad>('CONECTIVIDAD');

/** URL base de la API (`…/api/v1`, sin barra final). */
export const URL_API = new InjectionToken<string>('URL_API', {
  providedIn: 'root',
  factory: () => resolverUrlApi(environment, inject(DOCUMENT).defaultView?.location ?? null),
});

/** URL del panel web del Vendedor (D-37), sin barra final. */
export const URL_PANEL = new InjectionToken<string>('URL_PANEL', {
  providedIn: 'root',
  factory: () => resolverUrlPanel(environment, inject(DOCUMENT).defaultView?.location ?? null),
});

/** Asocia los puertos compartidos con sus adaptadores. */
export function proveerCompartido(): Provider[] {
  return [
    { provide: BASE_DATOS_LOCAL, useExisting: BaseDatosSqlite },
    { provide: CONECTIVIDAD, useExisting: ConectividadCapacitor },
    { provide: BARRA_ESTADO, useFactory: () => new BarraEstadoCapacitor() },
    {
      provide: ALMACEN_PREFERENCIA_TEMA,
      useFactory: () => new PreferenciaTemaSqlite(inject(BASE_DATOS_LOCAL)),
    },
  ];
}
