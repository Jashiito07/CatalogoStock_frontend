import { Conectividad } from '../../../compartido/aplicacion/puertos/conectividad.puerto';
import { CODIGOS_ERROR, ErrorApi, ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { ErrorSesionExpirada } from '../../dominio/errores';
import { ActualizarUsuarioActual } from './actualizar-usuario-actual.caso-uso';
import { GestorSesion } from '../gestor-sesion';
import { ApiUsuarios } from '../puertos/api-usuarios.puerto';

/**
 * Pedir el código que verifica el correo de la cuenta (RF-USU-05, D-50; contrato
 * correo.md, `POST /usuarios/yo/correo/verificacion`).
 *
 * El código solo se envía al correo registrado. Exige sesión y conexión. Si la API
 * responde 409 `CORREO_YA_VERIFICADO` (por ejemplo, se verificó desde otro dispositivo),
 * refresca el usuario para que el aviso desaparezca y relanza el error.
 */
export class SolicitarVerificacionCorreo {
  constructor(
    private readonly api: ApiUsuarios,
    private readonly gestor: GestorSesion,
    private readonly conectividad: Conectividad,
    private readonly actualizarUsuario: ActualizarUsuarioActual,
  ) {}

  async ejecutar(): Promise<void> {
    if (this.gestor.actual() === null) throw new ErrorSesionExpirada();
    if (!(await this.conectividad.estaConectado())) throw new ErrorSinConexion();
    try {
      await this.api.solicitarVerificacionCorreo();
    } catch (error) {
      if (error instanceof ErrorApi && error.codigo === CODIGOS_ERROR.correoYaVerificado) {
        await this.actualizarUsuario.ejecutar().catch(() => null);
      }
      throw error;
    }
  }
}
