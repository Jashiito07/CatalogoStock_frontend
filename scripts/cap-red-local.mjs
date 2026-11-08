// Ejecuta la CLI de Capacitor con la configuración de desarrollo en la red local
// (CS_RED_LOCAL=1: WebView en http://localhost y HTTP sin cifrar permitido).
// Solo para desarrollo; ver README, «Probar en el celular».
//
// Uso: node scripts/cap-red-local.mjs run android [opciones de cap]
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const ARCHIVO_ENTORNO = 'src/environments/environment.red-local.ts';

if (!existsSync(ARCHIVO_ENTORNO)) {
  console.error(
    `Falta ${ARCHIVO_ENTORNO}. Copia environment.red-local.example.ts con ese nombre y ` +
      'escribe la IP de tu PC (ver README).',
  );
  process.exit(1);
}

const argumentos = process.argv.slice(2);
if (argumentos.length === 0) {
  console.error('Indica el comando de Capacitor, por ejemplo: run android');
  process.exit(1);
}

const resultado = spawnSync('npx', ['cap', ...argumentos], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, CS_RED_LOCAL: '1' },
});
process.exit(resultado.status ?? 1);
