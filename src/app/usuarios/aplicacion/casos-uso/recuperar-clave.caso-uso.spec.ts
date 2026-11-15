import { ErrorApi, ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { ErrorDatosFormulario } from '../../dominio/errores';
import { SESION_DE_PRUEBA } from '../../pruebas/datos-de-prueba';
import { AlmacenSesionEnMemoria, ConectividadFalsa, crearApiFalsa } from '../../pruebas/dobles';
import { GestorSesion } from '../gestor-sesion';
import { RecuperarClave } from './recuperar-clave.caso-uso';

const DATOS = {
  correo: '  Maria.Zambrano@Correo.com ',
  codigo: '482 913',
  claveNueva: 'NuevaClave2026',
  confirmacionClave: 'NuevaClave2026',
};

function crear(api: ReturnType<typeof crearApiFalsa>, conectividad: ConectividadFalsa) {
  const almacen = new AlmacenSesionEnMemoria(SESION_DE_PRUEBA);
  const gestor = new GestorSesion(api, almacen);
  return { caso: new RecuperarClave(api, conectividad, gestor), almacen, gestor };
}

describe('RecuperarClave (RF-USU-05, D-35, D-39, D-50)', () => {
  it('RF-USU-05: al recuperar la clave borra la sesión local (el servidor revocó todas)', async () => {
    const api = crearApiFalsa();
    const { caso, almacen, gestor } = crear(api, new ConectividadFalsa(true));
    await gestor.restaurar();

    await caso.ejecutar(DATOS);

    expect(gestor.actual()).toBeNull();
    expect(almacen.guardada).toBeNull();
  });

  it('si la API rechaza el código, conserva la sesión local', async () => {
    const api = crearApiFalsa();
    api.recuperarClave.mockRejectedValue(new ErrorApi(422, 'CODIGO_INVALIDO', 'x'));
    const { caso, almacen, gestor } = crear(api, new ConectividadFalsa(true));
    await gestor.restaurar();

    await caso.ejecutar(DATOS).catch(() => undefined);

    expect(almacen.guardada).toEqual(SESION_DE_PRUEBA);
  });

  it('envía correo normalizado, código de 6 dígitos y clave nueva al contrato', async () => {
    const api = crearApiFalsa();
    const caso = crear(api, new ConectividadFalsa(true)).caso;

    await caso.ejecutar(DATOS);

    expect(api.recuperarClave).toHaveBeenCalledWith({
      correo: 'maria.zambrano@correo.com',
      codigo: '482913',
      claveNueva: 'NuevaClave2026',
    });
  });

  it('valida antes de llamar a la API: código, reglas de la clave y confirmación', async () => {
    const api = crearApiFalsa();
    const caso = crear(api, new ConectividadFalsa(true)).caso;

    const error = await caso
      .ejecutar({ correo: 'maria@', codigo: '12345', claveNueva: 'corta', confirmacionClave: 'otra' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorDatosFormulario);
    expect((error as ErrorDatosFormulario).errores).toEqual({
      correo: 'Ingrese un correo válido.',
      codigo: 'El código tiene 6 dígitos.',
      claveNueva: 'La clave debe tener entre 8 y 72 caracteres, con letras y números.',
      confirmacionClave: 'Las claves no coinciden.',
    });
    expect(api.recuperarClave).not.toHaveBeenCalled();
  });

  it('sin conexión no llama a la API', async () => {
    const api = crearApiFalsa();
    const caso = crear(api, new ConectividadFalsa(false)).caso;

    await expect(caso.ejecutar(DATOS)).rejects.toBeInstanceOf(ErrorSinConexion);
    expect(api.recuperarClave).not.toHaveBeenCalled();
  });

  it('propaga el 422 CODIGO_INVALIDO de la API', async () => {
    const api = crearApiFalsa();
    api.recuperarClave.mockRejectedValue(
      new ErrorApi(422, 'CODIGO_INVALIDO', 'El código no es válido o ya venció.'),
    );
    const caso = crear(api, new ConectividadFalsa(true)).caso;

    await expect(caso.ejecutar(DATOS)).rejects.toMatchObject({ codigo: 'CODIGO_INVALIDO' });
  });
});
