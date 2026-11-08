import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, Observable, switchMap, throwError } from 'rxjs';

import { URL_API } from '../../compartido/compartido.providers';
import { CODIGOS_ERROR } from '../../compartido/dominio/error-api';
import { codigoDeErrorHttp } from '../../compartido/infraestructura/error-http';
import { GestorSesion } from '../aplicacion/gestor-sesion';
import { ErrorSesionExpirada } from '../dominio/errores';
import { RUTAS_PUBLICAS } from './api-usuarios.http';

/** Motivo que recibe la pantalla de ingreso cuando la sesión terminó. */
export const MOTIVO_SESION_EXPIRADA = 'sesion-expirada';

function conToken(solicitud: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return solicitud.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

/**
 * Interceptor de autenticación (contrato, README y usuarios.md):
 *
 * - Agrega `Authorization: Bearer <tokenAcceso>` solo a las rutas protegidas de la API.
 * - Ante 401 `TOKEN_VENCIDO`, renueva la sesión con rotación (D-09) y repite la solicitud
 *   **una sola vez**. Varias solicitudes vencidas a la vez comparten una sola renovación
 *   (`GestorSesion.renovar`).
 * - Si la renovación es rechazada o llega otro 401, borra la sesión y lleva al ingreso.
 * - Sin conexión durante la renovación, la sesión se conserva (D-10).
 */
export const interceptorAutenticacion: HttpInterceptorFn = (solicitud, siguiente) => {
  const urlApi = inject(URL_API);
  const gestor = inject(GestorSesion);
  const router = inject(Router);

  if (!solicitud.url.startsWith(`${urlApi}/`)) return siguiente(solicitud);
  const ruta = solicitud.url.slice(urlApi.length).split('?')[0];
  if (RUTAS_PUBLICAS.includes(ruta)) return siguiente(solicitud);

  const terminarSesion = (): void => {
    void gestor.borrar();
    if (!router.url.startsWith('/ingreso')) {
      void router.navigate(['/ingreso'], { queryParams: { motivo: MOTIVO_SESION_EXPIRADA } });
    }
  };

  const tokenUsado = gestor.actual()?.tokenAcceso;
  const enviada = tokenUsado ? conToken(solicitud, tokenUsado) : solicitud;

  return siguiente(enviada).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      if (tokenUsado && codigoDeErrorHttp(error) === CODIGOS_ERROR.tokenVencido) {
        return renovarYRepetir(solicitud, siguiente, gestor, tokenUsado, terminarSesion);
      }
      // NO_AUTENTICADO u otro 401: hay que ingresar de nuevo.
      terminarSesion();
      return throwError(() => error);
    }),
  );
};

function renovarYRepetir(
  solicitud: HttpRequest<unknown>,
  siguiente: HttpHandlerFn,
  gestor: GestorSesion,
  tokenUsado: string,
  terminarSesion: () => void,
): Observable<HttpEvent<unknown>> {
  return from(gestor.renovar(tokenUsado)).pipe(
    catchError((error: unknown) => {
      if (error instanceof ErrorSesionExpirada) terminarSesion();
      return throwError(() => error);
    }),
    switchMap((sesion) =>
      siguiente(conToken(solicitud, sesion.tokenAcceso)).pipe(
        catchError((error: unknown) => {
          // Solo se repite una vez: un segundo 401 cierra la sesión.
          if (error instanceof HttpErrorResponse && error.status === 401) terminarSesion();
          return throwError(() => error);
        }),
      ),
    ),
  );
}
