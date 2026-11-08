import { ErrorApi } from '../../compartido/dominio/error-api';
import { ErrorSesionExpirada } from '../dominio/errores';
import { Sesion, Usuario } from '../dominio/sesion';
import { AlmacenSesion } from './puertos/almacen-sesion.puerto';
import { ApiUsuarios } from './puertos/api-usuarios.puerto';

export type OyenteSesion = (sesion: Sesion | null) => void;

/**
 * Sesión del Cliente en memoria y en el almacenamiento seguro (D-09, D-10, D-16).
 *
 * - `restaurar()` lee la sesión guardada una sola vez; sirve sin conexión aunque el
 *   token de acceso haya vencido (D-10).
 * - `renovar()` rota el token de renovación (D-09). Si varias solicitudes reciben
 *   `TOKEN_VENCIDO` a la vez, comparten una única renovación.
 * - Si la API rechaza la renovación (401 `TOKEN_INVALIDO`), borra solo la sesión; los
 *   datos locales y la futura cola de cambios en SQLite no se tocan.
 */
export class GestorSesion {
  private sesion: Sesion | null = null;
  private restauracion: Promise<Sesion | null> | null = null;
  private renovacionEnCurso: Promise<Sesion> | null = null;
  private readonly oyentes = new Set<OyenteSesion>();

  constructor(
    private readonly api: ApiUsuarios,
    private readonly almacen: AlmacenSesion,
  ) {}

  actual(): Sesion | null {
    return this.sesion;
  }

  /** Lee la sesión guardada en el dispositivo (una sola vez por arranque). */
  restaurar(): Promise<Sesion | null> {
    this.restauracion ??= this.almacen
      .leer()
      .catch(() => null)
      .then((guardada) => {
        // Una sesión iniciada mientras se leía el almacenamiento tiene prioridad.
        if (this.sesion === null && guardada !== null) this.cambiar(guardada);
        return this.sesion;
      });
    return this.restauracion;
  }

  async establecer(sesion: Sesion): Promise<void> {
    await this.almacen.guardar(sesion);
    this.restauracion = Promise.resolve(sesion);
    this.cambiar(sesion);
  }

  /** Actualiza los datos del usuario (por ejemplo, tras `GET /usuarios/yo`). */
  async actualizarUsuario(usuario: Usuario): Promise<void> {
    if (this.sesion === null) return;
    await this.establecer({ ...this.sesion, usuario });
  }

  /** Borra la sesión del dispositivo. Nunca falla: si el almacén falla, la olvida en memoria. */
  async borrar(): Promise<void> {
    this.restauracion = Promise.resolve(null);
    this.cambiar(null);
    try {
      await this.almacen.borrar();
    } catch {
      // La sesión ya no está en memoria; el próximo arranque la intentará leer y validar.
    }
  }

  /**
   * Renueva la sesión con rotación (D-09).
   *
   * @param tokenAccesoUsado token con el que falló la solicitud. Si ya hay otro más
   * nuevo (otra solicitud renovó antes), se devuelve la sesión actual sin renovar.
   */
  renovar(tokenAccesoUsado?: string): Promise<Sesion> {
    if (this.renovacionEnCurso) return this.renovacionEnCurso;
    const sesion = this.sesion;
    if (sesion === null) return Promise.reject(new ErrorSesionExpirada());
    if (tokenAccesoUsado !== undefined && sesion.tokenAcceso !== tokenAccesoUsado) {
      return Promise.resolve(sesion);
    }

    this.renovacionEnCurso = (async () => {
      try {
        const nueva = await this.api.renovar(sesion.tokenRenovacion);
        await this.establecer(nueva);
        return nueva;
      } catch (error) {
        // 401 TOKEN_INVALIDO (vencido, revocado o reutilizado) o 400: hay que ingresar de nuevo.
        if (error instanceof ErrorApi && (error.estado === 401 || error.estado === 400)) {
          await this.borrar();
          throw new ErrorSesionExpirada();
        }
        // Sin conexión, 429 u otro fallo temporal: se conserva la sesión (D-10).
        throw error;
      }
    })().finally(() => {
      this.renovacionEnCurso = null;
    });
    return this.renovacionEnCurso;
  }

  /** Escucha los cambios de sesión; devuelve la función para dejar de escuchar. */
  suscribir(oyente: OyenteSesion): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }

  private cambiar(sesion: Sesion | null): void {
    this.sesion = sesion;
    for (const oyente of this.oyentes) oyente(sesion);
  }
}
