// Núcleo de `preparar-licencia.mjs` (D-59): decide de dónde sale la clave de la licencia de
// PrimeNG (PrimeUI Community) y escribe `src/environments/licencia-primeng.local.ts`,
// archivo ignorado por Git. La clave NUNCA se imprime ni se versiona.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const VARIABLE_ENTORNO = 'PRIMEUI_LICENSE';
const PATRON_CLAVE_EN_ARCHIVO = /LICENCIA_PRIMENG\s*=\s*'((?:[^'\\\r\n]|\\.)*)'/;

/** Quita espacios en los extremos (p. ej. el salto de línea final de un archivo de texto). */
export function normalizarClave(texto) {
  return (texto ?? '').trim();
}

/** Lanza un error (sin incluir la clave) si la clave contiene espacios o saltos de línea. */
export function validarClave(clave) {
  if (/\s/.test(clave) || /[\u0000-\u001f\u2028\u2029]/.test(clave)) {
    throw new Error(
      'La clave de licencia no es válida: no debe contener espacios ni saltos de línea.',
    );
  }
}

/** Escapa la clave para usarla dentro de un literal TypeScript entre comillas simples. */
export function escaparLiteral(clave) {
  return clave.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

export function generarContenido(clave) {
  return (
    '// GENERADO por scripts/preparar-licencia.mjs. IGNORADO por Git: no lo versiones ni lo\n' +
    '// compartas (los términos de PrimeUI prohíben publicar la clave; ver README).\n' +
    `export const LICENCIA_PRIMENG = '${escaparLiteral(clave)}';\n`
  );
}

/** Lee la clave de un archivo `licencia-primeng.local.ts` existente ('' si no hay). */
export function leerClaveDeArchivoLocal(ruta) {
  if (!existsSync(ruta)) return '';
  const coincidencia = PATRON_CLAVE_EN_ARCHIVO.exec(readFileSync(ruta, 'utf8'));
  if (!coincidencia) return '';
  return coincidencia[1].replace(/\\(.)/g, '$1');
}

/**
 * Prioridad: variable de entorno → archivo de claves del usuario → vacío.
 * Devuelve la clave normalizada y el origen, sin escribir nada.
 */
export function resolverClave({ env, rutaArchivoClave }) {
  const deEntorno = normalizarClave(env[VARIABLE_ENTORNO]);
  if (deEntorno) return { clave: deEntorno, origen: 'entorno' };
  if (rutaArchivoClave && existsSync(rutaArchivoClave)) {
    const deArchivo = normalizarClave(readFileSync(rutaArchivoClave, 'utf8'));
    if (deArchivo) return { clave: deArchivo, origen: 'archivo' };
  }
  return { clave: '', origen: 'ninguno' };
}

/**
 * Garantiza que exista `rutaLocal`. No sobrescribe un archivo con clave por uno vacío.
 * Devuelve { estado: 'aplicada' | 'sin-clave', mensaje } y el mensaje nunca contiene la clave.
 */
export function prepararLicencia({ env, rutaArchivoClave, rutaLocal }) {
  const { clave } = resolverClave({ env, rutaArchivoClave });
  validarClave(clave);
  const claveExistente = leerClaveDeArchivoLocal(rutaLocal);

  if (clave) {
    if (clave !== claveExistente) {
      mkdirSync(path.dirname(rutaLocal), { recursive: true });
      writeFileSync(rutaLocal, generarContenido(clave), 'utf8');
    }
    return { estado: 'aplicada', mensaje: 'Licencia de PrimeNG: clave aplicada.' };
  }

  if (claveExistente) {
    return { estado: 'aplicada', mensaje: 'Licencia de PrimeNG: clave aplicada.' };
  }

  if (!existsSync(rutaLocal)) {
    mkdirSync(path.dirname(rutaLocal), { recursive: true });
    writeFileSync(rutaLocal, generarContenido(''), 'utf8');
  }
  return {
    estado: 'sin-clave',
    mensaje:
      'Licencia de PrimeNG: sin clave (aparecerá el aviso «Invalid PrimeUI License»; ver README).',
  };
}
