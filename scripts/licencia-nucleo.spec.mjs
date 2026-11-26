// Pruebas de la preparación de la licencia de PrimeNG (D-59; `npm run test:scripts`).
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  escaparLiteral,
  generarContenido,
  leerClaveDeArchivoLocal,
  prepararLicencia,
  resolverClave,
  validarClave,
} from './licencia-nucleo.mjs';

const FALSA_ENTORNO = 'CLAVE-FALSA-ENTORNO-111';
const FALSA_ARCHIVO = 'CLAVE-FALSA-ARCHIVO-222';

describe('licencia de PrimeNG', () => {
  let dir;
  let rutaArchivoClave;
  let rutaLocal;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'licencia-'));
    rutaArchivoClave = path.join(dir, 'claves', 'primeui.txt');
    rutaLocal = path.join(dir, 'src', 'environments', 'licencia-primeng.local.ts');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const guardarArchivoClave = (texto) => {
    rutaArchivoClave = path.join(dir, 'primeui.txt');
    writeFileSync(rutaArchivoClave, texto);
  };

  it('prioriza la variable de entorno sobre el archivo', () => {
    guardarArchivoClave(FALSA_ARCHIVO);
    const r = resolverClave({ env: { PRIMEUI_LICENSE: FALSA_ENTORNO }, rutaArchivoClave });
    expect(r).toEqual({ clave: FALSA_ENTORNO, origen: 'entorno' });
  });

  it('usa el archivo (sin el salto de línea final) si no hay variable', () => {
    guardarArchivoClave(`${FALSA_ARCHIVO}\r\n`);
    const r = resolverClave({ env: {}, rutaArchivoClave });
    expect(r).toEqual({ clave: FALSA_ARCHIVO, origen: 'archivo' });
  });

  it('queda vacía si no hay variable y el archivo no existe o está vacío', () => {
    expect(resolverClave({ env: {}, rutaArchivoClave }).clave).toBe('');
    guardarArchivoClave('  \n');
    expect(resolverClave({ env: { PRIMEUI_LICENSE: '  ' }, rutaArchivoClave }).clave).toBe('');
  });

  it('escapa comillas y barras invertidas', () => {
    expect(escaparLiteral(`a'b\\c`)).toBe(`a\\'b\\\\c`);
    writeFileSync(rutaArchivoClave = path.join(dir, 'k.txt'), '');
    const clave = `ab'cd\\ef`;
    prepararLicencia({ env: { PRIMEUI_LICENSE: clave }, rutaArchivoClave, rutaLocal });
    expect(readFileSync(rutaLocal, 'utf8')).toBe(generarContenido(clave));
    expect(leerClaveDeArchivoLocal(rutaLocal)).toBe(clave);
  });

  it('rechaza claves con espacios o saltos de línea sin revelarlas', () => {
    expect(() => validarClave('CLAVE CON ESPACIO')).toThrow(/no debe contener espacios/);
    expect(() => validarClave('ABC\nDEF')).toThrow();
    try {
      validarClave('SECRETO CON ESPACIO');
    } catch (e) {
      expect(String(e.message)).not.toContain('SECRETO');
    }
    expect(() =>
      prepararLicencia({ env: { PRIMEUI_LICENSE: 'AB CD' }, rutaArchivoClave, rutaLocal }),
    ).toThrow();
    expect(existsSync(rutaLocal)).toBe(false);
  });

  it('crea el archivo local vacío si no hay ninguna clave', () => {
    const r = prepararLicencia({ env: {}, rutaArchivoClave, rutaLocal });
    expect(r.estado).toBe('sin-clave');
    expect(readFileSync(rutaLocal, 'utf8')).toContain("LICENCIA_PRIMENG = '';");
  });

  it('no sobrescribe una clave válida con una vacía', () => {
    prepararLicencia({ env: { PRIMEUI_LICENSE: FALSA_ENTORNO }, rutaArchivoClave, rutaLocal });
    const r = prepararLicencia({ env: {}, rutaArchivoClave, rutaLocal });
    expect(r.estado).toBe('aplicada');
    expect(leerClaveDeArchivoLocal(rutaLocal)).toBe(FALSA_ENTORNO);
  });

  it('reemplaza la clave anterior cuando llega una nueva', () => {
    prepararLicencia({ env: { PRIMEUI_LICENSE: FALSA_ENTORNO }, rutaArchivoClave, rutaLocal });
    prepararLicencia({ env: { PRIMEUI_LICENSE: FALSA_ARCHIVO }, rutaArchivoClave, rutaLocal });
    expect(leerClaveDeArchivoLocal(rutaLocal)).toBe(FALSA_ARCHIVO);
  });

  it('no escribe la clave en la salida ni en los mensajes', () => {
    const espiaLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const espiaError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = prepararLicencia({
      env: { PRIMEUI_LICENSE: FALSA_ENTORNO },
      rutaArchivoClave,
      rutaLocal,
    });
    expect(r.mensaje).toBe('Licencia de PrimeNG: clave aplicada.');
    expect(r.mensaje).not.toContain(FALSA_ENTORNO);
    expect(JSON.stringify(r)).not.toContain(FALSA_ENTORNO);
    for (const espia of [espiaLog, espiaError]) {
      expect(JSON.stringify(espia.mock.calls)).not.toContain(FALSA_ENTORNO);
    }
    espiaLog.mockRestore();
    espiaError.mockRestore();
  });
});
