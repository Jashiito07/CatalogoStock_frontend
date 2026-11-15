import { Conectividad } from '../../../compartido/aplicacion/puertos/conectividad.puerto';
import { ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { ErrorDatosFormulario } from '../../dominio/errores';
import {
  DatosFormularioRecuperacion,
  normalizarCodigoRecuperacion,
  normalizarCorreo,
  validarRecuperacion,
} from '../../dominio/validaciones-usuario';
import { GestorSesion } from '../gestor-sesion';
import { ApiUsuarios } from '../puertos/api-usuarios.puerto';

/**
 * Recuperar la clave olvidada con el código que genera el Vendedor o que llega al correo
 * (RF-USU-05, D-35, D-39, D-50; contratos recuperacion-clave.md y correo.md,
 * `POST /autenticacion/recuperacion`: acepta ambos códigos).
 *
 * Valida igual que la API y exige conexión. Si la API acepta (204), la clave cambió y
 * el servidor cerró todas las sesiones del Cliente: hay que ingresar de nuevo.
 * El código nunca se guarda en el dispositivo.
 */
export class RecuperarClave {
  constructor(
    private readonly api: ApiUsuarios,
    private readonly conectividad: Conectividad,
    private readonly gestor: GestorSesion,
  ) {}

  async ejecutar(datos: DatosFormularioRecuperacion): Promise<void> {
    const errores = validarRecuperacion(datos);
    if (Object.keys(errores).length > 0) throw new ErrorDatosFormulario(errores);
    if (!(await this.conectividad.estaConectado())) throw new ErrorSinConexion();

    await this.api.recuperarClave({
      correo: normalizarCorreo(datos.correo),
      codigo: normalizarCodigoRecuperacion(datos.codigo),
      claveNueva: datos.claveNueva,
    });
    // El servidor revocó todas las sesiones (D-39): la copia local ya no sirve. Solo se
    // borra la sesión; los datos locales y la cola de cambios no se tocan (D-09).
    await this.gestor.borrar();
  }
}
