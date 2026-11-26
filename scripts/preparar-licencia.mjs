// Garantiza `src/environments/licencia-primeng.local.ts` (ignorado por Git) antes de compilar
// (D-59). La clave sale de PRIMEUI_LICENSE, o de %USERPROFILE%\catalogostock-claves\primeui.txt,
// o queda vacía. Nunca imprime la clave. Se ejecuta solo desde los ganchos `pre*` de npm.
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { prepararLicencia } from './licencia-nucleo.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  const { mensaje } = prepararLicencia({
    env: process.env,
    rutaArchivoClave: path.join(os.homedir(), 'catalogostock-claves', 'primeui.txt'),
    rutaLocal: path.join(raiz, 'src', 'environments', 'licencia-primeng.local.ts'),
  });
  console.log(mensaje);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo preparar la licencia.');
  process.exit(1);
}
