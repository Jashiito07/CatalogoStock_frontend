import { Conectividad } from '../../../compartido/aplicacion/puertos/conectividad.puerto';
import { ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { Usuario } from '../../dominio/sesion';
import { GestorSesion } from '../gestor-sesion';
import { ApiUsuarios } from '../puertos/api-usuarios.puerto';

/**
 * Con conexión, consulta `GET /usuarios/yo` para refrescar los datos del Cliente; si el
 * token de acceso venció, el interceptor renueva la sesión (D-10: «renueva al recuperar
 * la conexión»). Sin conexión devuelve los datos guardados.
 *
 * Lanza `ErrorSesionExpirada` si la renovación fue rechazada (hay que ingresar de nuevo).
 */
export class ActualizarUsuarioActual {
  constructor(
    private readonly api: ApiUsuarios,
    private readonly gestor: GestorSesion,
    private readonly conectividad: Conectividad,
  ) {}

  async ejecutar(): Promise<Usuario | null> {
    const sesion = this.gestor.actual();
    if (sesion === null) return null;
    if (!(await this.conectividad.estaConectado())) return sesion.usuario;
    try {
      const usuario = await this.api.obtenerUsuarioActual();
      await this.gestor.actualizarUsuario(usuario);
      return usuario;
    } catch (error) {
      if (error instanceof ErrorSinConexion) return sesion.usuario;
      throw error;
    }
  }
}
