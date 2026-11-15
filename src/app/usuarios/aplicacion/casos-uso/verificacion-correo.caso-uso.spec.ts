import { ErrorApi, ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { ErrorDatosFormulario, ErrorSesionExpirada } from '../../dominio/errores';
import { SESION_CORREO_VERIFICADO, SESION_DE_PRUEBA } from '../../pruebas/datos-de-prueba';
import { AlmacenSesionEnMemoria, ConectividadFalsa, crearApiFalsa } from '../../pruebas/dobles';
import { GestorSesion } from '../gestor-sesion';
import { ActualizarUsuarioActual } from './actualizar-usuario-actual.caso-uso';
import { ConfirmarVerificacionCorreo } from './confirmar-verificacion-correo.caso-uso';
import { SolicitarVerificacionCorreo } from './solicitar-verificacion-correo.caso-uso';

async function preparar(opciones: { conectado?: boolean; conSesion?: boolean } = {}) {
  const api = crearApiFalsa();
  const conectividad = new ConectividadFalsa(opciones.conectado ?? true);
  const almacen = new AlmacenSesionEnMemoria(opciones.conSesion === false ? null : SESION_DE_PRUEBA);
  const gestor = new GestorSesion(api, almacen);
  await gestor.restaurar();
  const actualizar = new ActualizarUsuarioActual(api, gestor, conectividad);
  return { api, conectividad, gestor, actualizar };
}

describe('SolicitarVerificacionCorreo (RF-USU-05, D-50)', () => {
  it('pide el código con POST /usuarios/yo/correo/verificacion', async () => {
    const { api, gestor, conectividad, actualizar } = await preparar();
    await new SolicitarVerificacionCorreo(api, gestor, conectividad, actualizar).ejecutar();

    expect(api.solicitarVerificacionCorreo).toHaveBeenCalledTimes(1);
  });

  it('sin conexión no llama a la API', async () => {
    const { api, gestor, conectividad, actualizar } = await preparar({ conectado: false });
    const caso = new SolicitarVerificacionCorreo(api, gestor, conectividad, actualizar);

    await expect(caso.ejecutar()).rejects.toBeInstanceOf(ErrorSinConexion);
    expect(api.solicitarVerificacionCorreo).not.toHaveBeenCalled();
  });

  it('sin sesión no llama a la API', async () => {
    const { api, gestor, conectividad, actualizar } = await preparar({ conSesion: false });
    const caso = new SolicitarVerificacionCorreo(api, gestor, conectividad, actualizar);

    await expect(caso.ejecutar()).rejects.toBeInstanceOf(ErrorSesionExpirada);
    expect(api.solicitarVerificacionCorreo).not.toHaveBeenCalled();
  });

  it('409 CORREO_YA_VERIFICADO: refresca el usuario y relanza el error', async () => {
    const { api, gestor, conectividad, actualizar } = await preparar();
    api.solicitarVerificacionCorreo.mockRejectedValue(
      new ErrorApi(409, 'CORREO_YA_VERIFICADO', 'x'),
    );
    api.obtenerUsuarioActual.mockResolvedValue(SESION_CORREO_VERIFICADO.usuario);
    const caso = new SolicitarVerificacionCorreo(api, gestor, conectividad, actualizar);

    await expect(caso.ejecutar()).rejects.toMatchObject({ codigo: 'CORREO_YA_VERIFICADO' });
    expect(gestor.actual()?.usuario.correoVerificadoEn).toBe('2026-11-15T09:00:00-05:00');
  });

  it.each([
    [429, 'DEMASIADAS_SOLICITUDES'],
    [503, 'CORREO_NO_DISPONIBLE'],
  ])('propaga el %i %s sin tocar la sesión', async (estado, codigo) => {
    const { api, gestor, conectividad, actualizar } = await preparar();
    api.solicitarVerificacionCorreo.mockRejectedValue(new ErrorApi(estado, codigo, 'x'));
    const caso = new SolicitarVerificacionCorreo(api, gestor, conectividad, actualizar);

    await expect(caso.ejecutar()).rejects.toMatchObject({ estado, codigo });
    expect(gestor.actual()).toEqual(SESION_DE_PRUEBA);
  });
});

describe('ConfirmarVerificacionCorreo (RF-USU-05, D-50)', () => {
  const reloj = () => new Date('2026-11-15T15:00:00Z');

  it('envía el código sin espacios y toma la fecha oficial de GET /usuarios/yo', async () => {
    const { api, gestor, conectividad, actualizar } = await preparar();
    api.obtenerUsuarioActual.mockResolvedValue(SESION_CORREO_VERIFICADO.usuario);

    await new ConfirmarVerificacionCorreo(api, gestor, conectividad, actualizar, reloj).ejecutar(
      '482 913',
    );

    expect(api.confirmarVerificacionCorreo).toHaveBeenCalledWith('482913');
    expect(gestor.actual()?.usuario.correoVerificadoEn).toBe('2026-11-15T09:00:00-05:00');
  });

  it('si el refresco falla después del 204, oculta el aviso con la fecha local', async () => {
    const { api, gestor, conectividad, actualizar } = await preparar();
    api.obtenerUsuarioActual.mockRejectedValue(new ErrorApi(500, 'ERROR_INTERNO', 'x'));

    await new ConfirmarVerificacionCorreo(api, gestor, conectividad, actualizar, reloj).ejecutar(
      '482913',
    );

    expect(gestor.actual()?.usuario.correoVerificadoEn).toBe('2026-11-15T15:00:00.000Z');
  });

  it('valida los 6 dígitos antes de llamar a la API', async () => {
    const { api, gestor, conectividad, actualizar } = await preparar();
    const caso = new ConfirmarVerificacionCorreo(api, gestor, conectividad, actualizar, reloj);

    await expect(caso.ejecutar('12a')).rejects.toBeInstanceOf(ErrorDatosFormulario);
    expect(api.confirmarVerificacionCorreo).not.toHaveBeenCalled();
  });

  it('sin conexión no llama a la API', async () => {
    const { api, gestor, conectividad, actualizar } = await preparar({ conectado: false });
    const caso = new ConfirmarVerificacionCorreo(api, gestor, conectividad, actualizar, reloj);

    await expect(caso.ejecutar('482913')).rejects.toBeInstanceOf(ErrorSinConexion);
    expect(api.confirmarVerificacionCorreo).not.toHaveBeenCalled();
  });

  it('422 CODIGO_INVALIDO: relanza el error y el correo sigue sin verificar', async () => {
    const { api, gestor, conectividad, actualizar } = await preparar();
    api.confirmarVerificacionCorreo.mockRejectedValue(new ErrorApi(422, 'CODIGO_INVALIDO', 'x'));
    const caso = new ConfirmarVerificacionCorreo(api, gestor, conectividad, actualizar, reloj);

    await expect(caso.ejecutar('482913')).rejects.toMatchObject({ codigo: 'CODIGO_INVALIDO' });
    expect(gestor.actual()?.usuario.correoVerificadoEn).toBeNull();
  });
});
