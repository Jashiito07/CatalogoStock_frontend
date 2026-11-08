import { ErrorApi, ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { SESION_DE_PRUEBA, SESION_RENOVADA } from '../../pruebas/datos-de-prueba';
import { AlmacenSesionEnMemoria, ConectividadFalsa, crearApiFalsa } from '../../pruebas/dobles';
import { GestorSesion } from '../gestor-sesion';
import { CerrarSesion } from './cerrar-sesion.caso-uso';

const ANTES_DE_VENCER = new Date('2026-11-07T10:00:00-05:00');
const DESPUES_DE_VENCER = new Date('2026-11-07T11:00:00-05:00');

async function preparar(conectado: boolean, ahora = ANTES_DE_VENCER) {
  const api = crearApiFalsa();
  const almacen = new AlmacenSesionEnMemoria(SESION_DE_PRUEBA);
  const gestor = new GestorSesion(api, almacen);
  await gestor.restaurar();
  const caso = new CerrarSesion(api, gestor, new ConectividadFalsa(conectado), () => ahora);
  return { api, almacen, gestor, caso };
}

describe('CerrarSesion (RF-USU-01, D-09)', () => {
  it('con conexión revoca el token de renovación y borra la sesión local', async () => {
    const { api, almacen, gestor, caso } = await preparar(true);

    await caso.ejecutar();

    expect(api.salir).toHaveBeenCalledWith('renovacion-1');
    expect(gestor.actual()).toBeNull();
    expect(almacen.guardada).toBeNull();
  });

  it('si el acceso venció, renueva primero y revoca el token más reciente', async () => {
    const { api, caso } = await preparar(true, DESPUES_DE_VENCER);
    api.renovar.mockResolvedValue(SESION_RENOVADA);

    await caso.ejecutar();

    expect(api.renovar).toHaveBeenCalledWith('renovacion-1');
    expect(api.salir).toHaveBeenCalledWith('renovacion-2');
  });

  it('sin conexión borra la sesión local sin llamar a la API', async () => {
    const { api, almacen, caso } = await preparar(false);

    await caso.ejecutar();

    expect(api.salir).not.toHaveBeenCalled();
    expect(almacen.guardada).toBeNull();
  });

  it.each([
    ['sin respuesta', new ErrorSinConexion()],
    ['sesión ya inválida', new ErrorApi(401, 'NO_AUTENTICADO', 'x')],
  ])('si la salida falla (%s) igual borra la sesión local', async (_caso, error) => {
    const { api, almacen, caso } = await preparar(true);
    api.salir.mockRejectedValue(error);

    await expect(caso.ejecutar()).resolves.toBeUndefined();
    expect(almacen.guardada).toBeNull();
  });
});
