import { ErrorApi, ErrorSinConexion } from '../../compartido/dominio/error-api';
import { ErrorSesionExpirada } from '../dominio/errores';
import { SESION_DE_PRUEBA, SESION_RENOVADA } from '../pruebas/datos-de-prueba';
import { AlmacenSesionEnMemoria, crearApiFalsa } from '../pruebas/dobles';
import { GestorSesion } from './gestor-sesion';

describe('GestorSesion (D-09, D-10, D-16)', () => {
  it('D-10: restaura la sesión guardada aunque el token de acceso haya vencido', async () => {
    const gestor = new GestorSesion(crearApiFalsa(), new AlmacenSesionEnMemoria(SESION_DE_PRUEBA));

    expect(await gestor.restaurar()).toEqual(SESION_DE_PRUEBA);
    expect(gestor.actual()).toEqual(SESION_DE_PRUEBA);
  });

  it('lee el almacenamiento una sola vez por arranque', async () => {
    const almacen = new AlmacenSesionEnMemoria(SESION_DE_PRUEBA);
    const leer = vi.spyOn(almacen, 'leer');
    const gestor = new GestorSesion(crearApiFalsa(), almacen);

    await Promise.all([gestor.restaurar(), gestor.restaurar()]);
    await gestor.restaurar();

    expect(leer).toHaveBeenCalledTimes(1);
  });

  it('si el almacenamiento falla, arranca sin sesión', async () => {
    const almacen = new AlmacenSesionEnMemoria();
    vi.spyOn(almacen, 'leer').mockRejectedValue(new Error('Keystore'));
    const gestor = new GestorSesion(crearApiFalsa(), almacen);

    expect(await gestor.restaurar()).toBeNull();
  });

  it('D-09: renueva con rotación y guarda la sesión nueva', async () => {
    const api = crearApiFalsa();
    api.renovar.mockResolvedValue(SESION_RENOVADA);
    const almacen = new AlmacenSesionEnMemoria(SESION_DE_PRUEBA);
    const gestor = new GestorSesion(api, almacen);
    await gestor.restaurar();

    expect(await gestor.renovar('acceso-1')).toEqual(SESION_RENOVADA);
    expect(api.renovar).toHaveBeenCalledWith('renovacion-1');
    expect(almacen.guardada).toEqual(SESION_RENOVADA);
  });

  it('varias renovaciones simultáneas usan una sola llamada a la API', async () => {
    const api = crearApiFalsa();
    let resolver: (sesion: typeof SESION_RENOVADA) => void = () => undefined;
    api.renovar.mockReturnValue(new Promise((r) => (resolver = r)));
    const gestor = new GestorSesion(api, new AlmacenSesionEnMemoria(SESION_DE_PRUEBA));
    await gestor.restaurar();

    const promesas = [gestor.renovar('acceso-1'), gestor.renovar('acceso-1'), gestor.renovar()];
    resolver(SESION_RENOVADA);
    const resultados = await Promise.all(promesas);

    expect(api.renovar).toHaveBeenCalledTimes(1);
    expect(resultados.every((s) => s.tokenAcceso === 'acceso-2')).toBe(true);
  });

  it('no renueva otra vez si otra solicitud ya obtuvo un token nuevo', async () => {
    const api = crearApiFalsa();
    api.renovar.mockResolvedValue(SESION_RENOVADA);
    const gestor = new GestorSesion(api, new AlmacenSesionEnMemoria(SESION_DE_PRUEBA));
    await gestor.restaurar();

    await gestor.renovar('acceso-1');
    const tardia = await gestor.renovar('acceso-1');

    expect(api.renovar).toHaveBeenCalledTimes(1);
    expect(tardia.tokenAcceso).toBe('acceso-2');
  });

  it('401 TOKEN_INVALIDO: borra la sesión y avisa que hay que ingresar de nuevo', async () => {
    const api = crearApiFalsa();
    api.renovar.mockRejectedValue(new ErrorApi(401, 'TOKEN_INVALIDO', 'x'));
    const almacen = new AlmacenSesionEnMemoria(SESION_DE_PRUEBA);
    const gestor = new GestorSesion(api, almacen);
    await gestor.restaurar();

    await expect(gestor.renovar('acceso-1')).rejects.toBeInstanceOf(ErrorSesionExpirada);
    expect(gestor.actual()).toBeNull();
    expect(almacen.guardada).toBeNull();
  });

  it('D-10: sin conexión durante la renovación conserva la sesión', async () => {
    const api = crearApiFalsa();
    api.renovar.mockRejectedValue(new ErrorSinConexion());
    const almacen = new AlmacenSesionEnMemoria(SESION_DE_PRUEBA);
    const gestor = new GestorSesion(api, almacen);
    await gestor.restaurar();

    await expect(gestor.renovar('acceso-1')).rejects.toBeInstanceOf(ErrorSinConexion);
    expect(gestor.actual()).toEqual(SESION_DE_PRUEBA);
    expect(almacen.guardada).toEqual(SESION_DE_PRUEBA);
  });

  it('sin sesión no se puede renovar', async () => {
    const gestor = new GestorSesion(crearApiFalsa(), new AlmacenSesionEnMemoria());
    await expect(gestor.renovar()).rejects.toBeInstanceOf(ErrorSesionExpirada);
  });

  it('avisa a los suscriptores al cambiar la sesión', async () => {
    const gestor = new GestorSesion(crearApiFalsa(), new AlmacenSesionEnMemoria());
    const cambios: (string | null)[] = [];
    const dejar = gestor.suscribir((s) => cambios.push(s?.usuario.nombre ?? null));

    await gestor.establecer(SESION_DE_PRUEBA);
    await gestor.actualizarUsuario({ ...SESION_DE_PRUEBA.usuario, nombre: 'Ana' });
    await gestor.borrar();
    dejar();
    await gestor.establecer(SESION_DE_PRUEBA);

    expect(cambios).toEqual(['María Zambrano', 'Ana', null]);
  });

  it('borrar nunca falla aunque el almacenamiento falle', async () => {
    const almacen = new AlmacenSesionEnMemoria(SESION_DE_PRUEBA);
    vi.spyOn(almacen, 'borrar').mockRejectedValue(new Error('Keystore'));
    const gestor = new GestorSesion(crearApiFalsa(), almacen);
    await gestor.restaurar();

    await expect(gestor.borrar()).resolves.toBeUndefined();
    expect(gestor.actual()).toBeNull();
  });
});
