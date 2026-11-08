/**
 * Usuario y sesión tal como los devuelve la API (contrato de usuarios, «Modelo»).
 * El rol solo sirve para mostrar la pantalla correcta: la API comprueba siempre los
 * permisos (RF-USU-03).
 */

export type Rol = 'CLIENTE' | 'VENDEDOR';

export interface Usuario {
  readonly id: string;
  readonly nombre: string;
  readonly correo: string;
  readonly telefono: string;
  readonly rol: Rol;
  readonly privacidadAceptadaEn: string | null;
  readonly versionPrivacidad: string | null;
  readonly creadoEn: string;
}

export interface Sesion {
  /** JWT de 15 minutos (D-09). */
  readonly tokenAcceso: string;
  readonly venceAccesoEn: string;
  /** Token opaco de un solo uso, 7 días (D-09, D-27). */
  readonly tokenRenovacion: string;
  readonly venceRenovacionEn: string;
  readonly usuario: Usuario;
}

function esTextoNoVacio(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0;
}

function esTextoONulo(valor: unknown): valor is string | null {
  return valor === null || typeof valor === 'string';
}

/** Comprueba la forma de un usuario leído del almacenamiento o de la red. */
export function esUsuario(valor: unknown): valor is Usuario {
  if (typeof valor !== 'object' || valor === null) return false;
  const u = valor as Record<string, unknown>;
  return (
    esTextoNoVacio(u['id']) &&
    esTextoNoVacio(u['nombre']) &&
    esTextoNoVacio(u['correo']) &&
    typeof u['telefono'] === 'string' &&
    (u['rol'] === 'CLIENTE' || u['rol'] === 'VENDEDOR') &&
    esTextoONulo(u['privacidadAceptadaEn']) &&
    esTextoONulo(u['versionPrivacidad']) &&
    typeof u['creadoEn'] === 'string'
  );
}

/**
 * Comprueba la forma de una sesión guardada. Si el almacenamiento tiene datos
 * corruptos o de otra versión, la app los descarta y pide ingresar de nuevo.
 */
export function esSesion(valor: unknown): valor is Sesion {
  if (typeof valor !== 'object' || valor === null) return false;
  const s = valor as Record<string, unknown>;
  return (
    esTextoNoVacio(s['tokenAcceso']) &&
    esTextoNoVacio(s['venceAccesoEn']) &&
    esTextoNoVacio(s['tokenRenovacion']) &&
    esTextoNoVacio(s['venceRenovacionEn']) &&
    esUsuario(s['usuario'])
  );
}

/**
 * Indica si el token de acceso ya venció (o vence dentro del margen indicado).
 * Una fecha ilegible cuenta como vencida.
 */
export function accesoVencido(sesion: Sesion, ahora: Date, margenMs = 0): boolean {
  const vence = Date.parse(sesion.venceAccesoEn);
  return Number.isNaN(vence) || vence - margenMs <= ahora.getTime();
}

/** Primer nombre para el saludo del inicio. */
export function primerNombre(usuario: Pick<Usuario, 'nombre'>): string {
  return usuario.nombre.trim().split(/\s+/u)[0] ?? usuario.nombre;
}
