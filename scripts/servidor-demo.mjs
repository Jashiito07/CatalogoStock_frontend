// Servidor de demostración: sirve la app compilada (`npm run build:demo`) y reenvía `/api/`
// al backend, para publicar UN solo origen HTTPS con un túnel (ver README, «Demostración
// por internet (túnel)»). Sin dependencias.
//
// Variables: PUERTO (4300), BACKEND_URL (http://127.0.0.1:3100), RAIZ (carpeta del build) y
// ESCUCHAR (127.0.0.1). Por defecto escucha solo en 127.0.0.1; con ESCUCHAR=0.0.0.0 se abre
// a la red local para la presentación por Wi-Fi (`iniciar-presentacion.ps1 -Red`).
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { crearServidor, direccionEscucha, esSoloLocal } from './servidor-demo-nucleo.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(process.env.RAIZ ?? path.join(aqui, '..', 'dist', 'catalogostock-demo', 'browser'));
const puerto = Number(process.env.PUERTO ?? 4300);
const backendUrl = process.env.BACKEND_URL ?? 'http://127.0.0.1:3100';

if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
  console.error('PUERTO no es válido.');
  process.exit(1);
}
let escuchar;
try {
  escuchar = direccionEscucha(process.env.ESCUCHAR);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
if (!existsSync(path.join(raiz, 'index.html'))) {
  console.error(`No hay build de demostración en ${raiz}. Ejecuta primero: npm run build:demo`);
  process.exit(1);
}

const servidor = crearServidor({
  raiz,
  backendUrl,
  registrar: (linea) => console.log(`${new Date().toISOString()} ${linea}`),
});

servidor.listen(puerto, escuchar, () => {
  const api = new URL(backendUrl).origin;
  if (esSoloLocal(escuchar)) {
    console.log(`Demostración en http://${escuchar}:${puerto} (API → ${api})`);
    console.log(`Publícala con: cloudflared tunnel --url http://${escuchar}:${puerto}`);
  } else {
    console.log(`Demostración en la red local: http://<IP de este equipo>:${puerto} (escucha en ${escuchar}; API → ${api})`);
    console.log('Cualquier equipo de la misma red puede abrirla: apágala al terminar la presentación.');
  }
});

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => servidor.close(() => process.exit(0)));
}
