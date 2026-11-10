import { ErrorApi, ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { ErrorDatosFormulario, ErrorSesionExpirada } from '../../dominio/errores';
import { SESION_DE_PRUEBA, SESION_RENOVADA } from '../../pruebas/datos-de-prueba';
import { AlmacenSesionEnMemoria, ConectividadFalsa, crearApiFalsa } from '../../pruebas/dobles';
import { GestorSesion } from '../gestor-sesion';
import { CambiarClave } from './cambiar-clave.caso-uso';

const ANTES_DE_VENCER = new Date('2026-11-07T10:00:00-05:00');
const DESPUES_DE_VENCER = new Date('2026-11-07T11:00:00-05:00');

const DATOS = {
  claveActual: 'Catalogo2026',
  claveNueva: 'NuevaClave2026',
  confirmacionClave: 'NuevaClave2026',
};

async function preparar(conectado = true, ahora = ANTES_DE_VENCER, conSesion = true) {
  const api = crearApiFalsa();
  const gestor = new GestorSesion(api, new AlmacenSesionEnMemoria(conSesion ? SESION_DE_PRUEBA : null));
  await gestor.restaurar();
  const caso = new CambiarClave(api, gestor, new ConectividadFalsa(conectado), () => ahora);
  return { api, gestor, caso };
}

describe('CambiarClave (RF-USU-05, POST /usuarios/yo/clave)', () => {
  it('envía la clave actual, la nueva y el token de renovación de esta sesión', async () => {
    const { api, gestor, caso } = await preparar();

    await caso.ejecutar(DATOS);

    expect(api.cambiarClave).toHaveBeenCalledWith({
      claveActual: 'Catalogo2026',
      claveNueva: 'NuevaClave2026',
      tokenRenovacionActual: 'renovacion-1',
    });
    // La sesión actual se conserva.
    expect(gestor.actual()).toEqual(SESION_DE_PRUEBA);
  });

  it('D-09: si el acceso venció, renueva primero y envía el token de renovación vigente', async () => {
    const { api, caso } = await preparar(true, DESPUES_DE_VENCER);
    api.renovar.mockResolvedValue(SESION_RENOVADA);

    await caso.ejecutar(DATOS);

    expect(api.renovar).toHaveBeenCalledWith('renovacion-1');
    expect(api.cambiarClave).toHaveBeenCalledWith(
      expect.objectContaining({ tokenRenovacionActual: 'renovacion-2' }),
    );
  });

  it('la clave nueva debe ser distinta de la actual (no llama a la API)', async () => {
    const { api, caso } = await preparar();

    const error = await caso
      .ejecutar({ claveActual: 'Catalogo2026', claveNueva: 'Catalogo2026', confirmacionClave: 'Catalogo2026' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorDatosFormulario);
    expect((error as ErrorDatosFormulario).errores).toEqual({
      claveNueva: 'La clave nueva debe ser distinta de la actual.',
    });
    expect(api.cambiarClave).not.toHaveBeenCalled();
  });

  it('valida la clave actual, las reglas de la nueva y la confirmación', async () => {
    const { caso } = await preparar();

    const error = await caso
      .ejecutar({ claveActual: '', claveNueva: 'soloLetras', confirmacionClave: 'x' })
      .catch((e: unknown) => e);

    expect((error as ErrorDatosFormulario).errores).toEqual({
      claveActual: 'Ingrese su clave actual.',
      claveNueva: 'La clave debe tener entre 8 y 72 caracteres, con letras y números.',
      confirmacionClave: 'Las claves no coinciden.',
    });
  });

  it('sin conexión no llama a la API', async () => {
    const { api, caso } = await preparar(false);

    await expect(caso.ejecutar(DATOS)).rejects.toBeInstanceOf(ErrorSinConexion);
    expect(api.cambiarClave).not.toHaveBeenCalled();
  });

  it('sin sesión pide ingresar de nuevo', async () => {
    const { api, caso } = await preparar(true, ANTES_DE_VENCER, false);

    await expect(caso.ejecutar(DATOS)).rejects.toBeInstanceOf(ErrorSesionExpirada);
    expect(api.cambiarClave).not.toHaveBeenCalled();
  });

  it('propaga 422 CLAVE_ACTUAL_INCORRECTA', async () => {
    const { api, caso } = await preparar();
    api.cambiarClave.mockRejectedValue(
      new ErrorApi(422, 'CLAVE_ACTUAL_INCORRECTA', 'La clave actual no es correcta.'),
    );

    await expect(caso.ejecutar(DATOS)).rejects.toMatchObject({ codigo: 'CLAVE_ACTUAL_INCORRECTA' });
  });
});
