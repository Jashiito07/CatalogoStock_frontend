// LÃ³gica del servidor de demostraciÃ³n (sin dependencias): archivos estÃ¡ticos de la app,
// Â«fallbackÂ» de la SPA y proxy inverso de `/api/` hacia el backend. Se separa de
// `servidor-demo.mjs` para poder probarla con Vitest (`npm run test:scripts`).
//
// Seguridad: escucha solo en 127.0.0.1 (lo publica el tÃºnel), no sale de la carpeta del
// build y NUNCA registra cuerpos, cabeceras ni parÃ¡metros de la URL.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';

export const TIPOS_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
};

export const CACHE_CON_HASH = 'public, max-age=31536000, immutable';
export const CACHE_SIN_CACHE = 'no-cache';

const CABECERAS_SEGURIDAD = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
};

// Cabeceras que no se reenvÃ­an entre saltos (RFC 9110 Â§7.6.1).
const POR_SALTO = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

/** Tipo MIME segÃºn la extensiÃ³n; `application/octet-stream` si no se conoce. */
export function tipoMime(archivo) {
  return TIPOS_MIME[path.extname(archivo).toLowerCase()] ?? 'application/octet-stream';
}

/** Archivos del build de Angular con hash en el nombre (`main-ABCD1234.js`). */
export function tieneHash(archivo) {
  return /-[A-Za-z0-9_-]{8}\.[A-Za-z0-9]+$/u.test(path.basename(archivo));
}

/** Cabecera Cache-Control: larga con hash; `no-cache` para `index.html` y lo demÃ¡s. */
export function cacheControl(archivo) {
  return tieneHash(archivo) ? CACHE_CON_HASH : CACHE_SIN_CACHE;
}

/**
 * Convierte la ruta de la URL en una ruta dentro de `raiz`.
 * Devuelve `{ ruta }`, o `{ error: 400 | 403 }` si es invÃ¡lida o intenta salir de la carpeta.
 */
export function resolverRuta(raiz, rutaUrl) {
  let decodificada;
  try {
    decodificada = decodeURIComponent(rutaUrl);
  } catch {
    return { error: 400 };
  }
  if (decodificada.includes('\0')) return { error: 400 };
  const normalizada = decodificada.replaceAll('\\', '/');
  if (normalizada.split('/').includes('..')) return { error: 403 };
  const base = path.resolve(raiz);
  const ruta = path.resolve(base, `.${normalizada.startsWith('/') ? '' : '/'}${normalizada}`);
  if (ruta !== base && !ruta.startsWith(base + path.sep)) return { error: 403 };
  return { ruta };
}

function esRutaApi(ruta) {
  return ruta === '/api' || ruta.startsWith('/api/');
}

function responderTexto(res, estado, cuerpo, tipo = 'application/json; charset=utf-8') {
  if (res.headersSent) {
    res.destroy();
    return;
  }
  res.writeHead(estado, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
  res.end(cuerpo);
}

function responderJson(res, estado, codigo, mensaje) {
  responderTexto(res, estado, JSON.stringify({ codigo, mensaje }));
}

async function esArchivo(ruta) {
  try {
    return (await stat(ruta)).isFile();
  } catch {
    return false;
  }
}

async function servirEstatico(req, res, raiz, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    responderTexto(res, 405, 'MÃ©todo no permitido', 'text/plain; charset=utf-8');
    return;
  }
  const resuelta = resolverRuta(raiz, pathname);
  if (resuelta.error) {
    responderTexto(
      res,
      resuelta.error,
      resuelta.error === 403 ? 'Prohibido' : 'Solicitud invÃ¡lida',
      'text/plain; charset=utf-8',
    );
    return;
  }
  let archivo = resuelta.ruta;
  if (!(await esArchivo(archivo))) {
    // Una ruta con extensiÃ³n que no existe es un 404 real; el resto son rutas de la SPA.
    if (path.extname(pathname) !== '') {
      responderTexto(res, 404, 'No encontrado', 'text/plain; charset=utf-8');
      return;
    }
    archivo = path.join(path.resolve(raiz), 'index.html');
    if (!(await esArchivo(archivo))) {
      responderTexto(res, 404, 'Falta index.html: ejecuta Â«npm run build:demoÂ».', 'text/plain; charset=utf-8');
      return;
    }
  }
  const info = await stat(archivo);
  res.writeHead(200, {
    'Content-Type': tipoMime(archivo),
    'Content-Length': info.size,
    'Cache-Control': cacheControl(archivo),
    'Last-Modified': info.mtime.toUTCString(),
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const lectura = createReadStream(archivo);
  lectura.on('error', () => res.destroy());
  res.on('close', () => lectura.destroy());
  lectura.pipe(res);
}

function cabecerasHaciaBackend(req, destino) {
  const cabeceras = {};
  for (const [nombre, valor] of Object.entries(req.headers)) {
    if (!POR_SALTO.has(nombre)) cabeceras[nombre] = valor;
  }
  const origen = req.socket.remoteAddress ?? '';
  const previo = req.headers['x-forwarded-for'];
  cabeceras['x-forwarded-for'] = previo ? `${previo}, ${origen}` : origen;
  cabeceras['x-forwarded-proto'] = req.headers['x-forwarded-proto'] ?? 'http';
  if (req.headers.host) cabeceras['x-forwarded-host'] = req.headers.host;
  cabeceras.host = destino.host;
  return cabeceras;
}

function reenviarAlBackend(req, res, destino, timeoutMs) {
  const cliente = destino.protocol === 'https:' ? https : http;
  const proxy = cliente.request(
    {
      protocol: destino.protocol,
      hostname: destino.hostname,
      port: destino.port || (destino.protocol === 'https:' ? 443 : 80),
      method: req.method,
      path: req.url,
      headers: cabecerasHaciaBackend(req, destino),
      timeout: timeoutMs,
    },
    (respuesta) => {
      const cabeceras = {};
      for (const [nombre, valor] of Object.entries(respuesta.headers)) {
        if (!POR_SALTO.has(nombre)) cabeceras[nombre] = valor;
      }
      res.writeHead(respuesta.statusCode ?? 502, respuesta.statusMessage, cabeceras);
      respuesta.pipe(res);
      respuesta.on('error', () => res.destroy());
    },
  );
  proxy.on('timeout', () => proxy.destroy(new Error('TIMEOUT')));
  proxy.on('error', (error) => {
    const tiempo = error.message === 'TIMEOUT';
    responderJson(
      res,
      502,
      'BACKEND_NO_DISPONIBLE',
      tiempo
        ? 'El servidor no respondiÃ³ a tiempo. IntÃ©ntalo de nuevo en unos minutos.'
        : 'No se pudo conectar con el servidor. IntÃ©ntalo de nuevo en unos minutos.',
    );
  });
  // Si el visitante corta la peticiÃ³n, se corta tambiÃ©n hacia el backend.
  res.on('close', () => {
    if (!res.writableEnded) proxy.destroy();
  });
  req.on('error', () => proxy.destroy());
  req.pipe(proxy);
}

/**
 * Crea el servidor (sin escuchar todavÃ­a).
 * @param {{ raiz: string, backendUrl?: string, timeoutMs?: number, registrar?: (linea: string) => void }} opciones
 */
export function crearServidor({
  raiz,
  backendUrl = 'http://127.0.0.1:3100',
  timeoutMs = 30_000,
  registrar = () => {},
}) {
  const destino = new URL(backendUrl);
  if (destino.protocol !== 'http:' && destino.protocol !== 'https:') {
    throw new Error('BACKEND_URL debe ser una URL http o https.');
  }
  return http.createServer((req, res) => {
    for (const [nombre, valor] of Object.entries(CABECERAS_SEGURIDAD)) res.setHeader(nombre, valor);
    // Solo mÃ©todo, ruta sin parÃ¡metros y estado.
    let pathname = '/';
    try {
      pathname = new URL(req.url ?? '/', 'http://local').pathname;
    } catch {
      /* se atiende como Â«/Â» y fallarÃ¡ mÃ¡s abajo */
    }
    res.on('close', () => registrar(`${req.method} ${pathname} ${res.statusCode}`));
    const atender = esRutaApi(pathname)
      ? Promise.resolve(reenviarAlBackend(req, res, destino, timeoutMs))
      : servirEstatico(req, res, raiz, pathname);
    atender.catch(() => responderJson(res, 500, 'ERROR_INTERNO', 'Error interno del servidor de demostraciÃ³n.'));
  });
}
