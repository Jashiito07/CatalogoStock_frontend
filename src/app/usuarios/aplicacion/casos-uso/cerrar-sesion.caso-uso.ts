import { Conectividad } from '../../../compartido/aplicacion/puertos/conectividad.puerto';
import { accesoVencido } from '../../dominio/sesion';
import { GestorSesion } from '../gestor-sesion';
import { ApiUsuarios } from '../puertos/api-usuarios.puerto';

/** Margen para no enviar un token de acceso a punto de vencer. */
const MARGEN_VENCIMIENTO_MS = 30_000;

/**
 * Cierre de sesión (RF-USU-01, D-09). Con conexión revoca el token de renovación en el
 * servidor; sin conexión, o si el servidor falla, borra igual la sesión local y el
 * servidor la dejará vencer (contrato de usuarios, `POST /autenticacion/salida`).
 * Nunca borra los datos locales de SQLite.
 */
export class CerrarSesion {
  constructor(
    private readonly api: ApiUsuarios,
    private readonly gestor: GestorSesion,
    private readonly conectividad: Conectividad,
    private readonly reloj: () => Date = () => new Date(),
  ) {}

  async ejecutar(): Promise<void> {
    try {
      let sesion = this.gestor.actual();
      if (sesion !== null && (await this.conectividad.estaConectado())) {
        // La salida exige un token de acceso vigente: si venció, se renueva primero para
        // revocar el token de renovación más reciente de la familia.
        if (accesoVencido(sesion, this.reloj(), MARGEN_VENCIMIENTO_MS)) {
          sesion = await this.gestor.renovar();
        }
        await this.api.salir(sesion.tokenRenovacion);
      }
    } catch {
      // Sin conexión o sesión ya inválida: se cierra igual en el dispositivo.
    } finally {
      await this.gestor.borrar();
    }
  }
}
