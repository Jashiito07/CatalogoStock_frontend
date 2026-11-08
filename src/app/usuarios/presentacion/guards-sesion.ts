import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { GestorSesion } from '../aplicacion/gestor-sesion';

/**
 * PA-12: sin sesión no se ve ninguna pantalla interna. Con una sesión guardada entra
 * aunque no haya conexión o el token de acceso haya vencido (D-10). El rol solo decide
 * qué pantalla mostrar; la API comprueba siempre los permisos (RF-USU-03).
 */
export const conSesionGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const sesion = await inject(GestorSesion).restaurar();
  return sesion !== null && sesion.usuario.rol === 'CLIENTE'
    ? true
    : router.createUrlTree(['/bienvenida']);
};

/** Bienvenida, registro e ingreso solo se muestran sin sesión. */
export const sinSesionGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const sesion = await inject(GestorSesion).restaurar();
  return sesion === null || sesion.usuario.rol !== 'CLIENTE'
    ? true
    : router.createUrlTree(['/inicio']);
};
