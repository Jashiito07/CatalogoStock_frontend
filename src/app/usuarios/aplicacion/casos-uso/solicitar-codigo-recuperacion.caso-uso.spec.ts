import { ErrorApi, ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { ErrorDatosFormulario } from '../../dominio/errores';
import { ConectividadFalsa, crearApiFalsa } from '../../pruebas/dobles';
import { SolicitarCodigoRecuperacion } from './solicitar-codigo-recuperacion.caso-uso';

describe('SolicitarCodigoRecuperacion (RF-USU-05, D-50)', () => {
  it('envía el correo normalizado a POST /autenticacion/recuperacion/solicitud', async () => {
    const api = crearApiFalsa();
    const caso = new SolicitarCodigoRecuperacion(api, new ConectividadFalsa(true));

    await caso.ejecutar('  Maria.Zambrano@Correo.com ');

    expect(api.solicitarRecuperacionPorCorreo).toHaveBeenCalledWith('maria.zambrano@correo.com');
  });

  it('no devuelve nada que distinga si la cuenta existe (204 siempre)', async () => {
    const api = crearApiFalsa();
    const caso = new SolicitarCodigoRecuperacion(api, new ConectividadFalsa(true));

    await expect(caso.ejecutar('alguien@correo.com')).resolves.toBeUndefined();
  });

  it('valida el correo antes de llamar a la API', async () => {
    const api = crearApiFalsa();
    const caso = new SolicitarCodigoRecuperacion(api, new ConectividadFalsa(true));

    await expect(caso.ejecutar('maria@')).rejects.toBeInstanceOf(ErrorDatosFormulario);
    expect(api.solicitarRecuperacionPorCorreo).not.toHaveBeenCalled();
  });

  it('sin conexión no llama a la API', async () => {
    const api = crearApiFalsa();
    const caso = new SolicitarCodigoRecuperacion(api, new ConectividadFalsa(false));

    await expect(caso.ejecutar('maria@correo.com')).rejects.toBeInstanceOf(ErrorSinConexion);
    expect(api.solicitarRecuperacionPorCorreo).not.toHaveBeenCalled();
  });

  it('D-17: propaga el 429', async () => {
    const api = crearApiFalsa();
    api.solicitarRecuperacionPorCorreo.mockRejectedValue(
      new ErrorApi(429, 'DEMASIADAS_SOLICITUDES', 'x'),
    );
    const caso = new SolicitarCodigoRecuperacion(api, new ConectividadFalsa(true));

    await expect(caso.ejecutar('maria@correo.com')).rejects.toMatchObject({ estado: 429 });
  });
});
