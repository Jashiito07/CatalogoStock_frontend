import { AvisoPrivacidad } from '../../dominio/aviso-privacidad';
import { Sesion, Usuario } from '../../dominio/sesion';

/** Cuerpo de `POST /usuarios/registro` (contrato de usuarios). */
export interface SolicitudRegistro {
  readonly nombre: string;
  readonly correo: string;
  readonly telefono: string;
  readonly clave: string;
  readonly aceptaPrivacidad: true;
  readonly versionPrivacidad: string;
}

export interface Credenciales {
  readonly correo: string;
  readonly clave: string;
}

export type { AvisoPrivacidad };

/**
 * Puerto de la API de usuarios y autenticación. Los adaptadores lanzan `ErrorApi`
 * (respuesta con el formato del contrato) o `ErrorSinConexion` (sin respuesta).
 */
export interface ApiUsuarios {
  registrar(solicitud: SolicitudRegistro): Promise<Usuario>;
  /** Solo `POST /autenticacion/ingreso/cliente` (D-19). */
  ingresarCliente(credenciales: Credenciales): Promise<Sesion>;
  renovar(tokenRenovacion: string): Promise<Sesion>;
  salir(tokenRenovacion: string): Promise<void>;
  obtenerUsuarioActual(): Promise<Usuario>;
  obtenerAvisoPrivacidad(): Promise<AvisoPrivacidad>;
}
