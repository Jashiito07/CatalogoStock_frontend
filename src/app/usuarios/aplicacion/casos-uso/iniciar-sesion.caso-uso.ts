import { Conectividad } from '../../../compartido/aplicacion/puertos/conectividad.puerto';
import {
  CODIGOS_ERROR,
  ErrorApi,
  ErrorSinConexion,
} from '../../../compartido/dominio/error-api';
import { ErrorDatosFormulario } from '../../dominio/errores';
import { Sesion } from '../../dominio/sesion';
import { MENSAJES_VALIDACION, normalizarCorreo } from '../../dominio/validaciones-usuario';
import { GestorSesion } from '../gestor-sesion';
import { ApiUsuarios, Credenciales } from '../puertos/api-usuarios.puerto';

/**
 * Ingreso del Cliente (RF-USU-01, CA-01). Usa solo `/autenticacion/ingreso/cliente`
 * (D-19) y requiere conexión (D-10).
 */
export class IniciarSesion {
  constructor(
    private readonly api: ApiUsuarios,
    private readonly gestor: GestorSesion,
    private readonly conectividad: Conectividad,
  ) {}

  async ejecutar(credenciales: Credenciales): Promise<Sesion> {
    const correo = normalizarCorreo(credenciales.correo);
    const errores: Record<string, string> = {};
    if (correo.length === 0) errores['correo'] = MENSAJES_VALIDACION.correoIngreso;
    if (credenciales.clave.length === 0) errores['clave'] = MENSAJES_VALIDACION.claveIngreso;
    if (Object.keys(errores).length > 0) throw new ErrorDatosFormulario(errores);

    // PLAN 1.6: sin conexión y sin sesión previa no se puede ingresar.
    if (!(await this.conectividad.estaConectado())) throw new ErrorSinConexion();

    const sesion = await this.api.ingresarCliente({ correo, clave: credenciales.clave });

    // Defensa adicional: la API ya filtra por canal (D-19); la app es solo del Cliente
    // (D-01). Si llegara otro rol, la sesión no se guarda.
    if (sesion.usuario.rol !== 'CLIENTE') {
      throw new ErrorApi(401, CODIGOS_ERROR.credencialesInvalidas, 'Correo o clave incorrectos.');
    }

    await this.gestor.establecer(sesion);
    return sesion;
  }
}
