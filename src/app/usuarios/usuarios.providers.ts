import { inject, InjectionToken, Provider } from '@angular/core';

import { BASE_DATOS_LOCAL, CONECTIVIDAD } from '../compartido/compartido.providers';
import { ActualizarUsuarioActual } from './aplicacion/casos-uso/actualizar-usuario-actual.caso-uso';
import { CambiarClave } from './aplicacion/casos-uso/cambiar-clave.caso-uso';
import { CerrarSesion } from './aplicacion/casos-uso/cerrar-sesion.caso-uso';
import { ConsultarAvisoPrivacidad } from './aplicacion/casos-uso/consultar-aviso-privacidad.caso-uso';
import { IniciarSesion } from './aplicacion/casos-uso/iniciar-sesion.caso-uso';
import { RecuperarClave } from './aplicacion/casos-uso/recuperar-clave.caso-uso';
import { RegistrarCliente } from './aplicacion/casos-uso/registrar-cliente.caso-uso';
import { GestorSesion } from './aplicacion/gestor-sesion';
import { AlmacenSesion } from './aplicacion/puertos/almacen-sesion.puerto';
import { ApiUsuarios } from './aplicacion/puertos/api-usuarios.puerto';
import { CacheAvisoPrivacidad } from './aplicacion/puertos/cache-aviso-privacidad.puerto';
import { AlmacenSesionSeguro } from './infraestructura/almacen-sesion-seguro';
import { ApiUsuariosHttp } from './infraestructura/api-usuarios.http';
import { CacheAvisoPrivacidadSqlite } from './infraestructura/cache-aviso-privacidad.sqlite';

export const API_USUARIOS = new InjectionToken<ApiUsuarios>('API_USUARIOS');
export const ALMACEN_SESION = new InjectionToken<AlmacenSesion>('ALMACEN_SESION');
export const CACHE_AVISO_PRIVACIDAD = new InjectionToken<CacheAvisoPrivacidad>(
  'CACHE_AVISO_PRIVACIDAD',
);

/**
 * Puertos y casos de uso del módulo usuarios. Se registran en la raíz porque el
 * interceptor y los guards comparten la misma sesión.
 */
export function proveerUsuarios(): Provider[] {
  return [
    { provide: API_USUARIOS, useExisting: ApiUsuariosHttp },
    { provide: ALMACEN_SESION, useFactory: () => new AlmacenSesionSeguro() },
    {
      provide: CACHE_AVISO_PRIVACIDAD,
      useFactory: () => new CacheAvisoPrivacidadSqlite(inject(BASE_DATOS_LOCAL)),
    },
    {
      provide: GestorSesion,
      useFactory: () => new GestorSesion(inject(API_USUARIOS), inject(ALMACEN_SESION)),
    },
    {
      provide: IniciarSesion,
      useFactory: () =>
        new IniciarSesion(inject(API_USUARIOS), inject(GestorSesion), inject(CONECTIVIDAD)),
    },
    {
      provide: RegistrarCliente,
      useFactory: () =>
        new RegistrarCliente(inject(API_USUARIOS), inject(IniciarSesion), inject(CONECTIVIDAD)),
    },
    {
      provide: CerrarSesion,
      useFactory: () =>
        new CerrarSesion(inject(API_USUARIOS), inject(GestorSesion), inject(CONECTIVIDAD)),
    },
    {
      provide: ConsultarAvisoPrivacidad,
      useFactory: () =>
        new ConsultarAvisoPrivacidad(
          inject(API_USUARIOS),
          inject(CACHE_AVISO_PRIVACIDAD),
          inject(CONECTIVIDAD),
        ),
    },
    {
      provide: ActualizarUsuarioActual,
      useFactory: () =>
        new ActualizarUsuarioActual(inject(API_USUARIOS), inject(GestorSesion), inject(CONECTIVIDAD)),
    },
    {
      provide: RecuperarClave,
      useFactory: () => new RecuperarClave(inject(API_USUARIOS), inject(CONECTIVIDAD)),
    },
    {
      provide: CambiarClave,
      useFactory: () =>
        new CambiarClave(inject(API_USUARIOS), inject(GestorSesion), inject(CONECTIVIDAD)),
    },
  ];
}
