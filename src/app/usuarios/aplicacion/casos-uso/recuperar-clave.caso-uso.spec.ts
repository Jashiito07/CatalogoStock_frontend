import { ErrorApi, ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { ErrorDatosFormulario } from '../../dominio/errores';
import { ConectividadFalsa, crearApiFalsa } from '../../pruebas/dobles';
import { RecuperarClave } from './recuperar-clave.caso-uso';

const DATOS = {
  correo: '  Maria.Zambrano@Correo.com ',
  codigo: '482 913',
  claveNueva: 'NuevaClave2026',
  confirmacionClave: 'NuevaClave2026',
};

describe('RecuperarClave (RF-USU-05, D-35, D-39)', () => {
  it('envía correo normalizado, código de 6 dígitos y clave nueva al contrato', async () => {
    const api = crearApiFalsa();
    const caso = new RecuperarClave(api, new ConectividadFalsa(true));

    await caso.ejecutar(DATOS);

    expect(api.recuperarClave).toHaveBeenCalledWith({
      correo: 'maria.zambrano@correo.com',
      codigo: '482913',
      claveNueva: 'NuevaClave2026',
    });
  });

  it('valida antes de llamar a la API: código, reglas de la clave y confirmación', async () => {
    const api = crearApiFalsa();
    const caso = new RecuperarClave(api, new ConectividadFalsa(true));

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
    const caso = new RecuperarClave(api, new ConectividadFalsa(false));

    await expect(caso.ejecutar(DATOS)).rejects.toBeInstanceOf(ErrorSinConexion);
    expect(api.recuperarClave).not.toHaveBeenCalled();
  });

  it('propaga el 422 CODIGO_INVALIDO de la API', async () => {
    const api = crearApiFalsa();
    api.recuperarClave.mockRejectedValue(
      new ErrorApi(422, 'CODIGO_INVALIDO', 'El código no es válido o ya venció.'),
    );
    const caso = new RecuperarClave(api, new ConectividadFalsa(true));

    await expect(caso.ejecutar(DATOS)).rejects.toMatchObject({ codigo: 'CODIGO_INVALIDO' });
  });
});
