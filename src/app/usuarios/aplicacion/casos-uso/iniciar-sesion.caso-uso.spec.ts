import { ErrorApi, ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { ErrorDatosFormulario } from '../../dominio/errores';
import { SESION_DE_PRUEBA } from '../../pruebas/datos-de-prueba';
import { AlmacenSesionEnMemoria, ConectividadFalsa, crearApiFalsa } from '../../pruebas/dobles';
import { GestorSesion } from '../gestor-sesion';
import { IniciarSesion } from './iniciar-sesion.caso-uso';

function preparar(conectado = true) {
  const api = crearApiFalsa();
  const almacen = new AlmacenSesionEnMemoria();
  const gestor = new GestorSesion(api, almacen);
  const caso = new IniciarSesion(api, gestor, new ConectividadFalsa(conectado));
  return { api, almacen, gestor, caso };
}

describe('IniciarSesion (RF-USU-01, CA-01, D-19)', () => {
  it('CA-01: con credenciales válidas guarda la sesión del Cliente', async () => {
    const { api, almacen, gestor, caso } = preparar();

    await caso.ejecutar({ correo: '  Maria.Zambrano@Correo.com ', clave: 'Catalogo2026' });

    expect(api.ingresarCliente).toHaveBeenCalledWith({
      correo: 'maria.zambrano@correo.com',
      clave: 'Catalogo2026',
    });
    expect(gestor.actual()).toEqual(SESION_DE_PRUEBA);
    expect(almacen.guardada).toEqual(SESION_DE_PRUEBA);
  });

  it('CA-01: con credenciales incorrectas no guarda ninguna sesión', async () => {
    const { api, almacen, caso } = preparar();
    api.ingresarCliente.mockRejectedValue(
      new ErrorApi(401, 'CREDENCIALES_INVALIDAS', 'Correo o clave incorrectos.'),
    );

    await expect(caso.ejecutar({ correo: 'maria@correo.com', clave: 'Otra2026' })).rejects.toMatchObject({
      codigo: 'CREDENCIALES_INVALIDAS',
    });
    expect(almacen.guardada).toBeNull();
  });

  it('PLAN 1.6: sin conexión no intenta ingresar', async () => {
    const { api, caso } = preparar(false);

    await expect(caso.ejecutar({ correo: 'maria@correo.com', clave: 'Catalogo2026' })).rejects.toBeInstanceOf(
      ErrorSinConexion,
    );
    expect(api.ingresarCliente).not.toHaveBeenCalled();
  });

  it('exige correo y clave antes de llamar a la API', async () => {
    const { api, caso } = preparar();

    await expect(caso.ejecutar({ correo: ' ', clave: '' })).rejects.toBeInstanceOf(ErrorDatosFormulario);
    expect(api.ingresarCliente).not.toHaveBeenCalled();
  });

  it('D-01 / D-19: nunca guarda una sesión que no sea de Cliente', async () => {
    const { api, almacen, caso } = preparar();
    api.ingresarCliente.mockResolvedValue({
      ...SESION_DE_PRUEBA,
      usuario: { ...SESION_DE_PRUEBA.usuario, rol: 'VENDEDOR' },
    });

    await expect(caso.ejecutar({ correo: 'v@correo.com', clave: 'Clave2026' })).rejects.toMatchObject({
      codigo: 'CREDENCIALES_INVALIDAS',
    });
    expect(almacen.guardada).toBeNull();
  });
});
