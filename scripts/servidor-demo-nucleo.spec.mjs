// Pruebas del servidor de demostraciÃ³n (`npm run test:scripts`).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { cacheControl, crearServidor, resolverRuta, tieneHash, tipoMime } from './servidor-demo-nucleo.mjs';

function escuchar(servidor) {
  return new Promise((resolver) => {
    servidor.listen(0, '127.0.0.1', () => resolver(servidor.address().port));
  });
}

function cerrar(servidor) {
  return new Promise((resolver) => {
    servidor.close(() => resolver());
    servidor.closeAllConnections?.();
  });
}

/** PeticiÃ³n HTTP cruda (para rutas con `..` que `fetch` normalizarÃ­a). */
function crudo(puerto, linea) {
  return new Promise((resolver, rechazar) => {
    const socket = net.connect(puerto, '127.0.0.1', () => {
      socket.write(`${linea} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`);
    });
    let datos = '';
    socket.on('data', (d) => (datos += d));
    socket.on('end', () => resolver(datos));
    socket.on('error', rechazar);
  });
}

describe('utilidades', () => {
  it('tipos MIME correctos y respaldo binario', () => {
    expect(tipoMime('index.html')).toBe('text/html; charset=utf-8');
    expect(tipoMime('main-ABCD1234.js')).toBe('text/javascript; charset=utf-8');
    expect(tipoMime('styles.css')).toBe('text/css; charset=utf-8');
    expect(tipoMime('a.SVG')).toBe('image/svg+xml');
    expect(tipoMime('sql-wasm.wasm')).toBe('application/wasm');
    expect(tipoMime('f.woff2')).toBe('font/woff2');
    expect(tipoMime('x.desconocido')).toBe('application/octet-stream');
  });

  it('cachÃ© larga solo con hash; index.html sin cachÃ©', () => {
    expect(tieneHash('main-ABCD1234.js')).toBe(true);
    expect(tieneHash('chunk--TEw8YCR.js')).toBe(true);
    expect(tieneHash('index.html')).toBe(false);
    expect(cacheControl('chunk-A1B2C3D4.js')).toContain('immutable');
    expect(cacheControl('index.html')).toBe('no-cache');
    expect(cacheControl('favicon.ico')).toBe('no-cache');
  });

  it('resolverRuta impide salir de la carpeta', () => {
    const raiz = path.resolve('/tmp/demo');
    expect(resolverRuta(raiz, '/a/b.js').ruta).toBe(path.join(raiz, 'a', 'b.js'));
    expect(resolverRuta(raiz, '/../secreto').error).toBe(403);
    expect(resolverRuta(raiz, '/%2e%2e/secreto').error).toBe(403);
    expect(resolverRuta(raiz, '/a/..%5C..%5Csecreto').error).toBe(403);
    expect(resolverRuta(raiz, '/a%00.js').error).toBe(400);
    expect(resolverRuta(raiz, '/%E0%A4%A').error).toBe(400);
  });
});

describe('servidor de demostraciÃ³n', () => {
  let carpeta;
  let backend;
  let puertoBackend;
  let servidor;
  let puerto;
  let registros;
  let ultimaPeticion;

  beforeAll(async () => {
    carpeta = mkdtempSync(path.join(os.tmpdir(), 'demo-'));
    const raiz = path.join(carpeta, 'sitio');
    mkdirSync(path.join(raiz, 'assets'), { recursive: true });
    writeFileSync(path.join(raiz, 'index.html'), '<html>app</html>');
    writeFileSync(path.join(raiz, 'main-ABCD1234.js'), 'console.log(1)');
    writeFileSync(path.join(raiz, 'assets', 'sql-wasm.wasm'), 'wasm');
    writeFileSync(path.join(carpeta, 'secreto.txt'), 'NO');

    backend = http.createServer((req, res) => {
      const trozos = [];
      req.on('data', (t) => trozos.push(t));
      req.on('end', () => {
        ultimaPeticion = { metodo: req.method, url: req.url, cabeceras: req.headers, cuerpo: Buffer.concat(trozos) };
        if (req.url?.startsWith('/api/v1/salud')) {
          res.writeHead(200, { 'Content-Type': 'application/json', 'X-Prueba': 'si' });
          res.end('{"estado":"ok"}');
        } else if (req.url?.startsWith('/api/v1/ingreso')) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end('{"codigo":"CREDENCIALES_INVALIDAS"}');
        } else if (req.url?.startsWith('/api/v1/eco')) {
          res.writeHead(201, { 'Content-Type': 'application/octet-stream' });
          res.end(ultimaPeticion.cuerpo);
        } else {
          res.writeHead(404);
          res.end();
        }
      });
    });
    puertoBackend = await escuchar(backend);

    registros = [];
    servidor = crearServidor({
      raiz,
      backendUrl: `http://127.0.0.1:${puertoBackend}`,
      timeoutMs: 2000,
      registrar: (l) => registros.push(l),
    });
    puerto = await escuchar(servidor);
  });

  afterAll(async () => {
    await cerrar(servidor);
    await cerrar(backend);
    rmSync(carpeta, { recursive: true, force: true });
  });

  const url = (ruta) => `http://127.0.0.1:${puerto}${ruta}`;

  it('sirve index.html sin cachÃ© y con cabeceras de seguridad', async () => {
    const r = await fetch(url('/'));
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(r.headers.get('cache-control')).toBe('no-cache');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('referrer-policy')).toBe('no-referrer');
    expect(r.headers.get('x-frame-options')).toBe('DENY');
    expect(await r.text()).toBe('<html>app</html>');
  });

  it('sirve archivos con hash con cachÃ© larga y MIME correcto', async () => {
    const r = await fetch(url('/main-ABCD1234.js'));
    expect(r.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
    expect(r.headers.get('cache-control')).toContain('max-age=31536000');
    const w = await fetch(url('/assets/sql-wasm.wasm'));
    expect(w.headers.get('content-type')).toBe('application/wasm');
  });

  it('devuelve index.html en las rutas de la SPA y 404 en archivos inexistentes', async () => {
    const spa = await fetch(url('/inicio/catalogo?x=1'));
    expect(spa.status).toBe(200);
    expect(await spa.text()).toBe('<html>app</html>');
    expect((await fetch(url('/falta.js'))).status).toBe(404);
  });

  it('rechaza mÃ©todos no permitidos en estÃ¡ticos', async () => {
    expect((await fetch(url('/'), { method: 'POST', body: 'x' })).status).toBe(405);
  });

  it('no permite salir de la carpeta (path traversal)', async () => {
    for (const linea of [
      'GET /../secreto.txt',
      'GET /%2e%2e/secreto.txt',
      'GET /assets/..%2f..%2fsecreto.txt',
      'GET /..%5csecreto.txt',
    ]) {
      const respuesta = await crudo(puerto, linea);
      expect(respuesta).toMatch(/^HTTP\/1\.1 (400|403|404)/u);
      expect(respuesta).not.toContain('NO');
    }
  });

  it('proxy: GET conserva cÃ³digo, cabeceras de respuesta y aÃ±ade X-Forwarded-*', async () => {
    const r = await fetch(url('/api/v1/salud?a=1'), { headers: { Authorization: 'Bearer abc' } });
    expect(r.status).toBe(200);
    expect(r.headers.get('x-prueba')).toBe('si');
    expect(await r.json()).toEqual({ estado: 'ok' });
    expect(ultimaPeticion.metodo).toBe('GET');
    expect(ultimaPeticion.url).toBe('/api/v1/salud?a=1');
    expect(ultimaPeticion.cabeceras['x-forwarded-for']).toBe('127.0.0.1');
    expect(ultimaPeticion.cabeceras['x-forwarded-proto']).toBe('http');
    expect(ultimaPeticion.cabeceras.authorization).toBe('Bearer abc');
  });

  it('proxy: conserva un X-Forwarded-Proto https del tÃºnel y encadena X-Forwarded-For', async () => {
    await fetch(url('/api/v1/salud'), {
      headers: { 'X-Forwarded-Proto': 'https', 'X-Forwarded-For': '203.0.113.9' },
    });
    expect(ultimaPeticion.cabeceras['x-forwarded-proto']).toBe('https');
    expect(ultimaPeticion.cabeceras['x-forwarded-for']).toBe('203.0.113.9, 127.0.0.1');
  });

  it('proxy: POST con cuerpo y conserva el estado (401)', async () => {
    const r = await fetch(url('/api/v1/ingreso'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: 'a@b.ec', clave: 'x' }),
    });
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ codigo: 'CREDENCIALES_INVALIDAS' });
    expect(ultimaPeticion.metodo).toBe('POST');
    expect(JSON.parse(ultimaPeticion.cuerpo.toString())).toEqual({ correo: 'a@b.ec', clave: 'x' });
  });

  it('proxy: cuerpos grandes (5 MB, como multipart) pasan Ã­ntegros', async () => {
    const cuerpo = Buffer.alloc(5 * 1024 * 1024, 'ab');
    const r = await fetch(url('/api/v1/eco'), {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=x' },
      body: cuerpo,
    });
    expect(r.status).toBe(201);
    const recibido = Buffer.from(await r.arrayBuffer());
    expect(recibido.length).toBe(cuerpo.length);
    expect(recibido.equals(cuerpo)).toBe(true);
  });

  it('proxy: un 404 del backend no se convierte en la SPA', async () => {
    expect((await fetch(url('/api/v1/nada'))).status).toBe(404);
  });

  it('registra solo mÃ©todo, ruta sin parÃ¡metros y estado', async () => {
    await fetch(url('/api/v1/salud?token=VALOR-PRIVADO'), { headers: { Authorization: 'Bearer zzz' } });
    await new Promise((r) => setTimeout(r, 50));
    expect(registros).toContain('GET /api/v1/salud 200');
    const todo = registros.join('\n');
    expect(todo).not.toContain('VALOR-PRIVADO');
    expect(todo).not.toContain('Bearer');
  });

  it('502 claro si el backend no responde', async () => {
    const muerto = http.createServer();
    const p = await escuchar(muerto);
    await cerrar(muerto);
    const caido = crearServidor({ raiz: carpeta, backendUrl: `http://127.0.0.1:${p}`, timeoutMs: 500 });
    const pc = await escuchar(caido);
    const r = await fetch(`http://127.0.0.1:${pc}/api/v1/salud`);
    expect(r.status).toBe(502);
    const cuerpo = await r.json();
    expect(cuerpo.codigo).toBe('BACKEND_NO_DISPONIBLE');
    expect(cuerpo.mensaje).toContain('No se pudo conectar');
    await cerrar(caido);
  });

  it('502 si el backend no contesta a tiempo', async () => {
    const lento = http.createServer(() => {
      /* nunca responde */
    });
    const pl = await escuchar(lento);
    const proxy = crearServidor({ raiz: carpeta, backendUrl: `http://127.0.0.1:${pl}`, timeoutMs: 200 });
    const pp = await escuchar(proxy);
    const r = await fetch(`http://127.0.0.1:${pp}/api/v1/salud`);
    expect(r.status).toBe(502);
    expect((await r.json()).mensaje).toContain('a tiempo');
    await cerrar(proxy);
    await cerrar(lento);
  });

  it('rechaza un BACKEND_URL que no sea http(s)', () => {
    expect(() => crearServidor({ raiz: carpeta, backendUrl: 'ftp://x' })).toThrow(/BACKEND_URL/);
  });
});
