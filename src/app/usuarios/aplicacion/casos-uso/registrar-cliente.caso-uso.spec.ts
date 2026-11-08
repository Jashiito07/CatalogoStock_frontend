import { ErrorApi, ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { ErrorDatosFormulario } from '../../dominio/errores';
import { DatosFormularioRegistro } from '../../dominio/validaciones-usuario';
import { SESION_DE_PRUEBA } from '../../pruebas/datos-de-prueba';
import { AlmacenSesionEnMemoria, ConectividadFalsa, crearApiFalsa } from '../../pruebas/dobles';
import { GestorSesion } from '../gestor-sesion';
import { IniciarSesion } from './iniciar-sesion.caso-uso';
import { RegistrarCliente } from './registrar-cliente.caso-uso';

const DATOS: DatosFormularioRegistro = {
  nombre: '  María Zambrano ',
  correo: 'Maria.Zambrano@Correo.com',
  telefono: '099 123 4567',
  clave: 'Catalogo2026',
  confirmacionClave: 'Catalogo2026',
  aceptaPrivacidad: true,
};

function preparar(conectado = true) {
  const api = crearApiFalsa();
  const almacen = new AlmacenSesionEnMemoria();
  const conectividad = new ConectividadFalsa(conectado);
  const iniciar = new IniciarSesion(api, new GestorSesion(api, almacen), conectividad);
  return { api, almacen, caso: new RegistrarCliente(api, iniciar, conectividad) };
}

describe('RegistrarCliente (RF-USU-01, RNF-16, D-11, D-14)', () => {
  it('CA-01: registra con los datos normalizados y la versión del aviso, y luego ingresa', async () => {
    const { api, almacen, caso } = preparar();

    const resultado = await caso.ejecutar(DATOS, '2026-11-1');

    expect(api.registrar).toHaveBeenCalledWith({
      nombre: 'María Zambrano',
      correo: 'maria.zambrano@correo.com',
      telefono: '+593991234567',
      clave: 'Catalogo2026',
      aceptaPrivacidad: true,
      versionPrivacidad: '2026-11-1',
    });
    expect(api.ingresarCliente).toHaveBeenCalledWith({
      correo: 'maria.zambrano@correo.com',
      clave: 'Catalogo2026',
    });
    expect(resultado).toEqual({ tipo: 'sesion-iniciada', sesion: SESION_DE_PRUEBA });
    expect(almacen.guardada).toEqual(SESION_DE_PRUEBA);
  });

  it('nunca envía el rol ni la confirmación de la clave (D-07)', async () => {
    const { api, caso } = preparar();
    await caso.ejecutar(DATOS, '2026-11-1');

    const cuerpo = api.registrar.mock.calls[0][0];
    expect(Object.keys(cuerpo).sort()).toEqual(
      ['aceptaPrivacidad', 'clave', 'correo', 'nombre', 'telefono', 'versionPrivacidad'].sort(),
    );
  });

  it('RNF-16: sin aceptar el aviso no llama a la API', async () => {
    const { api, caso } = preparar();

    await expect(caso.ejecutar({ ...DATOS, aceptaPrivacidad: false }, '2026-11-1')).rejects.toBeInstanceOf(
      ErrorDatosFormulario,
    );
    expect(api.registrar).not.toHaveBeenCalled();
  });

  it('valida como la API antes de enviar (D-14, D-22)', async () => {
    const { api, caso } = preparar();

    await expect(
      caso.ejecutar({ ...DATOS, telefono: '052123456', clave: 'ñ'.repeat(36) + '1' }, '2026-11-1'),
    ).rejects.toMatchObject({ errores: { telefono: expect.any(String), clave: expect.any(String) } });
    expect(api.registrar).not.toHaveBeenCalled();
  });

  it('sin conexión no intenta registrar', async () => {
    const { api, caso } = preparar(false);

    await expect(caso.ejecutar(DATOS, '2026-11-1')).rejects.toBeInstanceOf(ErrorSinConexion);
    expect(api.registrar).not.toHaveBeenCalled();
  });

  it('propaga CORREO_YA_REGISTRADO sin ingresar', async () => {
    const { api, caso } = preparar();
    api.registrar.mockRejectedValue(new ErrorApi(409, 'CORREO_YA_REGISTRADO', 'x'));

    await expect(caso.ejecutar(DATOS, '2026-11-1')).rejects.toMatchObject({ codigo: 'CORREO_YA_REGISTRADO' });
    expect(api.ingresarCliente).not.toHaveBeenCalled();
  });

  it('si la cuenta se creó pero el ingreso automático falla, lo informa sin perder el registro', async () => {
    const { api, almacen, caso } = preparar();
    api.ingresarCliente.mockRejectedValue(new ErrorApi(429, 'DEMASIADAS_SOLICITUDES', 'x'));

    const resultado = await caso.ejecutar(DATOS, '2026-11-1');

    expect(resultado.tipo).toBe('registrado-sin-sesion');
    expect(almacen.guardada).toBeNull();
  });
});
