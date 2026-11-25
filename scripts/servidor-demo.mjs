// Servidor de demostración: sirve la app compilada (`npm run build:demo`) y reenvía `/api/`
// al backend, para publicar UN solo origen HTTPS con un túnel (ver README, «Demostración
// por internet (túnel)»). Sin dependencias.
//
// Variables: PUERTO (4300), BACKEND_URL (http://127.0.0.1:3100), RAIZ (carpeta del build).
// Escucha solo en 127.0.0.1.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { crearServidor } from './servidor-demo-nucleo.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(process.env.RAIZ ?? path.join(aqui, '..', 'dist', 'catalogostock-demo', 'browser'));
const puerto = Number(process.env.PUERTO ?? 4300);
const backendUrl = process.env.BACKEND_URL ?? 'http://127.0.0.1:3100';

if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
  console.error('PUERTO no es válido.');
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

servidor.listen(puerto, '127.0.0.1', () => {
  console.log(`Demostración en http://127.0.0.1:${puerto} (API → ${new URL(backendUrl).origin})`);
  console.log('Publícala con: cloudflared tunnel --url http://127.0.0.1:' + puerto);
});

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => servidor.close(() => process.exit(0)));
}
