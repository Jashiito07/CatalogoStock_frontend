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

/** Cuerpo de `POST /autenticacion/recuperacion` (recuperacion-clave.md, RF-USU-05). */
export interface SolicitudRecuperacion {
  readonly correo: string;
  readonly codigo: string;
  readonly claveNueva: string;
}

/**
 * Cuerpo de `POST /usuarios/yo/clave` (recuperacion-clave.md). `tokenRenovacionActual`
 * identifica la sesión que se conserva; las demás se revocan.
 */
export interface SolicitudCambioClave {
  readonly claveActual: string;
  readonly claveNueva: string;
  readonly tokenRenovacionActual?: string;
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
  /** Público; responde 204 (RF-USU-05). */
  recuperarClave(solicitud: SolicitudRecuperacion): Promise<void>;
  /** Con sesión; responde 204 (RF-USU-05). */
  cambiarClave(solicitud: SolicitudCambioClave): Promise<void>;
}
