import { Conectividad } from '../../../compartido/aplicacion/puertos/conectividad.puerto';
import { ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { ErrorDatosFormulario, ErrorSesionExpirada } from '../../dominio/errores';
import {
  esCodigoRecuperacionValido,
  MENSAJES_VALIDACION,
  normalizarCodigoRecuperacion,
} from '../../dominio/validaciones-usuario';
import { GestorSesion } from '../gestor-sesion';
import { ApiUsuarios } from '../puertos/api-usuarios.puerto';
import { ActualizarUsuarioActual } from './actualizar-usuario-actual.caso-uso';

/**
 * Confirmar el correo con el código de 6 dígitos (RF-USU-05, D-50; contrato correo.md,
 * `POST /usuarios/yo/correo/confirmacion`). Exige sesión y conexión.
 *
 * Tras el 204, el servidor ya marcó el correo como verificado. La app refresca el
 * usuario (`GET /usuarios/yo`) para mostrar el dato oficial; si ese refresco falla (por
 * ejemplo, se cayó la conexión), guarda la fecha local solo para ocultar el aviso, y el
 * siguiente refresco la reemplaza por la del servidor.
 */
export class ConfirmarVerificacionCorreo {
  constructor(
    private readonly api: ApiUsuarios,
    private readonly gestor: GestorSesion,
    private readonly conectividad: Conectividad,
    private readonly actualizarUsuario: ActualizarUsuarioActual,
    private readonly reloj: () => Date = () => new Date(),
  ) {}

  async ejecutar(codigo: string): Promise<void> {
    if (!esCodigoRecuperacionValido(codigo)) {
      throw new ErrorDatosFormulario({ codigo: MENSAJES_VALIDACION.codigoRecuperacion });
    }
    if (this.gestor.actual() === null) throw new ErrorSesionExpirada();
    if (!(await this.conectividad.estaConectado())) throw new ErrorSinConexion();

    await this.api.confirmarVerificacionCorreo(normalizarCodigoRecuperacion(codigo));

    try {
      await this.actualizarUsuario.ejecutar();
    } catch {
      // El correo ya quedó verificado en el servidor; no se muestra un error por el refresco.
    }
    const usuario = this.gestor.actual()?.usuario;
    if (usuario && !usuario.correoVerificadoEn) {
      await this.gestor.actualizarUsuario({
        ...usuario,
        correoVerificadoEn: this.reloj().toISOString(),
      });
    }
  }
}
