import { Conectividad } from '../../../compartido/aplicacion/puertos/conectividad.puerto';
import { ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { ErrorDatosFormulario, ErrorSesionExpirada } from '../../dominio/errores';
import { accesoVencido } from '../../dominio/sesion';
import {
  DatosFormularioCambioClave,
  validarCambioClave,
} from '../../dominio/validaciones-usuario';
import { GestorSesion } from '../gestor-sesion';
import { ApiUsuarios } from '../puertos/api-usuarios.puerto';

/** Margen para no enviar un token de acceso a punto de vencer. */
const MARGEN_VENCIMIENTO_MS = 30_000;

/**
 * Cambiar la clave con la sesión iniciada (RF-USU-05; contrato recuperacion-clave.md,
 * `POST /usuarios/yo/clave`). Requiere conexión.
 *
 * Envía `tokenRenovacionActual` para que el servidor conserve esta sesión y cierre las
 * demás. Si el token de acceso venció, primero renueva la sesión: así el token de
 * renovación enviado es el vigente y no uno que la renovación del interceptor acabe de
 * rotar (D-09).
 */
export class CambiarClave {
  constructor(
    private readonly api: ApiUsuarios,
    private readonly gestor: GestorSesion,
    private readonly conectividad: Conectividad,
    private readonly reloj: () => Date = () => new Date(),
  ) {}

  async ejecutar(datos: DatosFormularioCambioClave): Promise<void> {
    const errores = validarCambioClave(datos);
    if (Object.keys(errores).length > 0) throw new ErrorDatosFormulario(errores);

    let sesion = this.gestor.actual();
    if (sesion === null) throw new ErrorSesionExpirada();
    if (!(await this.conectividad.estaConectado())) throw new ErrorSinConexion();

    if (accesoVencido(sesion, this.reloj(), MARGEN_VENCIMIENTO_MS)) {
      sesion = await this.gestor.renovar();
    }

    await this.api.cambiarClave({
      claveActual: datos.claveActual,
      claveNueva: datos.claveNueva,
      tokenRenovacionActual: sesion.tokenRenovacion,
    });
  }
}
