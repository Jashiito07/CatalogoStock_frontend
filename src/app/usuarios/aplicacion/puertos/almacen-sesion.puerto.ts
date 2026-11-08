import { Sesion } from '../../dominio/sesion';

/**
 * Dónde se guarda la sesión en el dispositivo (D-16): almacenamiento seguro (Keystore
 * en Android). Nunca `localStorage`, `@capacitor/preferences` ni SQLite.
 */
export interface AlmacenSesion {
  /** Devuelve la sesión guardada o `null` si no hay o está dañada. */
  leer(): Promise<Sesion | null>;
  guardar(sesion: Sesion): Promise<void>;
  borrar(): Promise<void>;
}
