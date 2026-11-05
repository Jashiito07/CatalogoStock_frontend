import { CLAVES_METADATOS } from '../../aplicacion/claves-metadatos';
import { EjecutorSql } from '../../aplicacion/puertos/base-datos-local.puerto';
import { MigracionLocal } from './migraciones-locales';

export class ErrorMigracion extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorMigracion';
  }
}

/** Lee la versión del esquema registrada en `metadatos` (0 si la base es nueva). */
export async function leerVersionEsquema(ejecutor: EjecutorSql): Promise<number> {
  const tablas = await ejecutor.consultar<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'metadatos'",
  );
  if (tablas.length === 0) {
    return 0;
  }
  const filas = await ejecutor.consultar<{ valor: string }>(
    'SELECT valor FROM metadatos WHERE clave = ?',
    [CLAVES_METADATOS.versionEsquema],
  );
  const version = filas.length > 0 ? Number(filas[0].valor) : 0;
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new ErrorMigracion(`Versión de esquema local inválida: «${filas[0]?.valor}»`);
  }
  return version;
}

function validarOrden(migraciones: readonly MigracionLocal[]): void {
  migraciones.forEach((migracion, indice) => {
    if (migracion.version !== indice + 1) {
      throw new ErrorMigracion(
        `Las migraciones deben numerarse de forma consecutiva desde 1: «${migracion.nombre}»`,
      );
    }
  });
}

/**
 * Aplica, en orden y cada una en su transacción, las migraciones posteriores a la
 * versión registrada. Devuelve la versión final del esquema.
 */
export async function aplicarMigraciones(
  ejecutor: EjecutorSql,
  migraciones: readonly MigracionLocal[],
): Promise<number> {
  validarOrden(migraciones);
  const versionActual = await leerVersionEsquema(ejecutor);
  if (versionActual > migraciones.length) {
    throw new ErrorMigracion(
      `La base local (v${versionActual}) es más nueva que la app (v${migraciones.length}).`,
    );
  }

  for (const migracion of migraciones.slice(versionActual)) {
    await ejecutor.ejecutarTransaccion([
      ...migracion.sentencias.map((sql) => ({ sql })),
      {
        sql:
          'INSERT INTO metadatos (clave, valor) VALUES (?, ?) ' +
          'ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor',
        parametros: [CLAVES_METADATOS.versionEsquema, String(migracion.version)],
      },
    ]);
  }
  return migraciones.length;
}
