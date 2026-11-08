import { ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { ErrorSesionExpirada } from '../../dominio/errores';
import { SESION_DE_PRUEBA } from '../../pruebas/datos-de-prueba';
import { AlmacenSesionEnMemoria, ConectividadFalsa, crearApiFalsa } from '../../pruebas/dobles';
import { GestorSesion } from '../gestor-sesion';
import { ActualizarUsuarioActual } from './actualizar-usuario-actual.caso-uso';

async function preparar(conectado: boolean) {
  const api = crearApiFalsa();
  const almacen = new AlmacenSesionEnMemoria(SESION_DE_PRUEBA);
  const gestor = new GestorSesion(api, almacen);
  await gestor.restaurar();
  return { api, almacen, caso: new ActualizarUsuarioActual(api, gestor, new ConectividadFalsa(conectado)) };
}

describe('ActualizarUsuarioActual (RF-USU-01, D-10)', () => {
  it('con conexión refresca los datos con GET /usuarios/yo y los guarda', async () => {
    const { api, almacen, caso } = await preparar(true);
    api.obtenerUsuarioActual.mockResolvedValue({ ...SESION_DE_PRUEBA.usuario, nombre: 'María Z.' });

    expect((await caso.ejecutar())?.nombre).toBe('María Z.');
    expect(almacen.guardada?.usuario.nombre).toBe('María Z.');
  });

  it('D-10: sin conexión usa los datos guardados', async () => {
    const { api, caso } = await preparar(false);

    expect(await caso.ejecutar()).toEqual(SESION_DE_PRUEBA.usuario);
    expect(api.obtenerUsuarioActual).not.toHaveBeenCalled();
  });

  it('si la red falla conserva los datos guardados', async () => {
    const { api, caso } = await preparar(true);
    api.obtenerUsuarioActual.mockRejectedValue(new ErrorSinConexion());

    expect(await caso.ejecutar()).toEqual(SESION_DE_PRUEBA.usuario);
  });

  it('propaga la sesión expirada para volver a ingresar', async () => {
    const { api, caso } = await preparar(true);
    api.obtenerUsuarioActual.mockRejectedValue(new ErrorSesionExpirada());

    await expect(caso.ejecutar()).rejects.toBeInstanceOf(ErrorSesionExpirada);
  });
});
