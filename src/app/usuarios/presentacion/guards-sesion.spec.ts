import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';

import { GestorSesion } from '../aplicacion/gestor-sesion';
import { Sesion } from '../dominio/sesion';
import { SESION_DE_PRUEBA } from '../pruebas/datos-de-prueba';
import { AlmacenSesionEnMemoria, crearApiFalsa } from '../pruebas/dobles';
import { conSesionGuard, sinSesionGuard } from './guards-sesion';

async function evaluar(
  guard: typeof conSesionGuard,
  sesionGuardada: Sesion | null,
): Promise<true | string> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: GestorSesion,
        useValue: new GestorSesion(crearApiFalsa(), new AlmacenSesionEnMemoria(sesionGuardada)),
      },
    ],
  });
  const resultado = await TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
  return resultado instanceof UrlTree ? resultado.toString() : (resultado as true);
}

describe('Guards de sesión (PA-12, D-10)', () => {
  it('PA-12: sin sesión no se ve ninguna pantalla interna', async () => {
    expect(await evaluar(conSesionGuard, null)).toBe('/bienvenida');
  });

  it('D-10: con una sesión guardada entra aunque el token de acceso haya vencido', async () => {
    expect(await evaluar(conSesionGuard, SESION_DE_PRUEBA)).toBe(true);
  });

  it('una sesión que no es de Cliente no entra a la app (D-01)', async () => {
    const vendedor = { ...SESION_DE_PRUEBA, usuario: { ...SESION_DE_PRUEBA.usuario, rol: 'VENDEDOR' as const } };
    expect(await evaluar(conSesionGuard, vendedor)).toBe('/bienvenida');
    TestBed.resetTestingModule();
    expect(await evaluar(sinSesionGuard, vendedor)).toBe(true);
  });

  it('con sesión, bienvenida, registro e ingreso llevan al inicio', async () => {
    expect(await evaluar(sinSesionGuard, SESION_DE_PRUEBA)).toBe('/inicio');
  });

  it('sin sesión, bienvenida, registro e ingreso se muestran', async () => {
    expect(await evaluar(sinSesionGuard, null)).toBe(true);
  });
});
