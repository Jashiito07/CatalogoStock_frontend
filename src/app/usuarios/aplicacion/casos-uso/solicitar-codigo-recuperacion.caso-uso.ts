import { Conectividad } from '../../../compartido/aplicacion/puertos/conectividad.puerto';
import { ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { ErrorDatosFormulario } from '../../dominio/errores';
import {
  esCorreoValido,
  MENSAJES_VALIDACION,
  normalizarCorreo,
} from '../../dominio/validaciones-usuario';
import { ApiUsuarios } from '../puertos/api-usuarios.puerto';

/**
 * Pedir el código de recuperación al correo de la cuenta (RF-USU-05, D-35, D-50;
 * contrato correo.md, `POST /autenticacion/recuperacion/solicitud`).
 *
 * La API responde 204 siempre, exista o no la cuenta: este caso de uso no devuelve nada
 * que permita distinguir los casos, y la pantalla muestra siempre el mismo mensaje.
 * Exige conexión. Un 429 (límite por IP o por cuenta) llega como `ErrorApi`.
 */
export class SolicitarCodigoRecuperacion {
  constructor(
    private readonly api: ApiUsuarios,
    private readonly conectividad: Conectividad,
  ) {}

  async ejecutar(correo: string): Promise<void> {
    if (!esCorreoValido(correo)) {
      throw new ErrorDatosFormulario({ correo: MENSAJES_VALIDACION.correo });
    }
    if (!(await this.conectividad.estaConectado())) throw new ErrorSinConexion();
    await this.api.solicitarRecuperacionPorCorreo(normalizarCorreo(correo));
  }
}
