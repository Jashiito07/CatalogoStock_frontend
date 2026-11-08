/**
 * Reglas de validación del registro y del ingreso (contrato de usuarios, «Validaciones»;
 * RNF-03). Son las mismas que aplica la API: la app avisa antes, pero el servidor valida
 * siempre. TypeScript puro, sin frameworks (RNF-14).
 */

export const MENSAJES_VALIDACION = {
  nombre: 'Ingrese su nombre (2 a 100 caracteres).',
  correo: 'Ingrese un correo válido.',
  telefono: 'Ingrese un celular de Ecuador válido, por ejemplo 0991234567.',
  clave: 'La clave debe tener entre 8 y 72 caracteres, con letras y números.',
  confirmacionClave: 'Las claves no coinciden.',
  aceptaPrivacidad: 'Debe aceptar el aviso de privacidad para crear su cuenta.',
  correoIngreso: 'Ingrese su correo.',
  claveIngreso: 'Ingrese su clave.',
} as const;

export const LONGITUD_MINIMA_NOMBRE = 2;
export const LONGITUD_MAXIMA_NOMBRE = 100;
export const LONGITUD_MAXIMA_CORREO = 254;
export const LONGITUD_MINIMA_CLAVE = 8;
/** Límite de bcrypt (D-08). */
export const LONGITUD_MAXIMA_CLAVE = 72;
/** bcrypt solo usa los primeros 72 bytes en UTF-8 (D-22). */
export const BYTES_MAXIMOS_CLAVE = 72;

/** Formato práctico de correo, idéntico al del backend. */
const FORMATO_CORREO =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

const CELULAR_NACIONAL = /^09(\d{8})$/;
const CELULAR_E164 = /^\+5939(\d{8})$/;
const SEPARADORES_TELEFONO = /[\s-]/g;
const TIENE_LETRA = /\p{L}/u;
const TIENE_NUMERO = /\p{Nd}/u;

const codificador = new TextEncoder();

/** Cuenta puntos de código, no unidades UTF-16 (tildes, eñes y emojis cuentan uno). */
function longitudEnCaracteres(texto: string): number {
  return [...texto].length;
}

/** Nombre: obligatorio, 2 a 100 caracteres tras recortar espacios. */
export function esNombreValido(nombre: string): boolean {
  const longitud = longitudEnCaracteres(nombre.trim());
  return longitud >= LONGITUD_MINIMA_NOMBRE && longitud <= LONGITUD_MAXIMA_NOMBRE;
}

/** El correo se recorta y se compara en minúsculas, como en la API. */
export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

/** Correo: formato válido y máximo 254 caracteres. */
export function esCorreoValido(correo: string): boolean {
  const normalizado = normalizarCorreo(correo);
  return (
    normalizado.length > 0 &&
    normalizado.length <= LONGITUD_MAXIMA_CORREO &&
    !normalizado.includes('..') &&
    FORMATO_CORREO.test(normalizado)
  );
}

/**
 * Teléfono (D-14): solo celular de Ecuador, `09XXXXXXXX` o `+5939XXXXXXXX`, ignorando
 * espacios y guiones. Devuelve el formato E.164 `+5939XXXXXXXX` o `null` si no es válido.
 */
export function normalizarTelefono(telefono: string): string | null {
  const limpio = telefono.replace(SEPARADORES_TELEFONO, '');
  const coincidencia = CELULAR_NACIONAL.exec(limpio) ?? CELULAR_E164.exec(limpio);
  return coincidencia ? `+5939${coincidencia[1]}` : null;
}

export function esTelefonoValido(telefono: string): boolean {
  return normalizarTelefono(telefono) !== null;
}

/** Bytes que ocupa el texto en UTF-8. */
export function bytesUtf8(texto: string): number {
  return codificador.encode(texto).length;
}

/**
 * Clave: 8 a 72 caracteres, al menos una letra y un número, y como máximo 72 bytes en
 * UTF-8 (D-22). No se recorta ni se normaliza.
 */
export function esClaveValida(clave: string): boolean {
  const longitud = longitudEnCaracteres(clave);
  return (
    longitud >= LONGITUD_MINIMA_CLAVE &&
    longitud <= LONGITUD_MAXIMA_CLAVE &&
    bytesUtf8(clave) <= BYTES_MAXIMOS_CLAVE &&
    TIENE_LETRA.test(clave) &&
    TIENE_NUMERO.test(clave)
  );
}

export interface DatosFormularioRegistro {
  readonly nombre: string;
  readonly correo: string;
  readonly telefono: string;
  readonly clave: string;
  readonly confirmacionClave: string;
  readonly aceptaPrivacidad: boolean;
}

export type CampoRegistro = keyof DatosFormularioRegistro;

/** Errores por campo del formulario de registro; vacío si todo es válido. */
export function validarRegistro(
  datos: DatosFormularioRegistro,
): Partial<Record<CampoRegistro, string>> {
  const errores: Partial<Record<CampoRegistro, string>> = {};
  if (!esNombreValido(datos.nombre)) errores.nombre = MENSAJES_VALIDACION.nombre;
  if (!esCorreoValido(datos.correo)) errores.correo = MENSAJES_VALIDACION.correo;
  if (!esTelefonoValido(datos.telefono)) errores.telefono = MENSAJES_VALIDACION.telefono;
  if (!esClaveValida(datos.clave)) errores.clave = MENSAJES_VALIDACION.clave;
  if (datos.confirmacionClave !== datos.clave) {
    errores.confirmacionClave = MENSAJES_VALIDACION.confirmacionClave;
  }
  if (datos.aceptaPrivacidad !== true) {
    errores.aceptaPrivacidad = MENSAJES_VALIDACION.aceptaPrivacidad;
  }
  return errores;
}
