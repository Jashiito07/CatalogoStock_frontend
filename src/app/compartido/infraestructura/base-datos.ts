import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

import {
  BaseDatosLocal,
  ResultadoEjecucion,
  SentenciaSql,
  ValorSql,
} from '../aplicacion/puertos/base-datos-local.puerto';
import { aplicarMigraciones } from './migraciones/aplicar-migraciones';
import { MIGRACIONES_LOCALES } from './migraciones/migraciones-locales';
import { conTiempoLimite } from './tiempo-limite';

/** Nombre de la base local del dispositivo. */
export const NOMBRE_BASE_DATOS = 'catalogostock';

/** Ruta donde Angular copia `sql-wasm.wasm` para el soporte web (jeep-sqlite). */
const RUTA_WASM_WEB = '/assets';

/** Tiempo máximo para abrir la base y migrarla antes de darla por no disponible. */
export const TIEMPO_LIMITE_INICIO_MS = 10_000;

/**
 * Servicio único de SQLite de la app del Cliente.
 *
 * - En Android usa el plugin nativo `@capacitor-community/sqlite`.
 * - En el navegador (`ionic serve`) usa jeep-sqlite, que guarda la base en IndexedDB.
 *
 * Abre la base «catalogostock», aplica las migraciones locales numeradas y expone
 * `ejecutar`, `consultar` y `ejecutarTransaccion` detrás del puerto `BaseDatosLocal`.
 */
@Injectable({ providedIn: 'root' })
export class BaseDatosSqlite implements BaseDatosLocal {
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);
  private readonly esWeb = Capacitor.getPlatform() === 'web';
  private conexion: SQLiteDBConnection | null = null;
  private inicializacion: Promise<void> | null = null;

  /**
   * Abre la base y aplica las migraciones una sola vez. Si no termina en
   * `TIEMPO_LIMITE_INICIO_MS` (por ejemplo, el WebAssembly de SQLite web aborta sin
   * rechazar la promesa), se rechaza con un error claro y se permite reintentar.
   */
  iniciar(): Promise<void> {
    if (!this.inicializacion) {
      this.inicializacion = conTiempoLimite(
        this.abrirYMigrar(),
        TIEMPO_LIMITE_INICIO_MS,
        'La base de datos local no respondió a tiempo.',
      ).catch((error: unknown) => {
        // Permite reintentar si la apertura falló (por ejemplo, almacenamiento lleno).
        this.inicializacion = null;
        throw error;
      });
    }
    return this.inicializacion;
  }

  async ejecutar(sql: string, parametros: readonly ValorSql[] = []): Promise<ResultadoEjecucion> {
    return this.ejecutarEn(await this.obtenerConexion(), sql, parametros);
  }

  async consultar<T extends object>(sql: string, parametros: readonly ValorSql[] = []): Promise<T[]> {
    return this.consultarEn<T>(await this.obtenerConexion(), sql, parametros);
  }

  async ejecutarTransaccion(sentencias: readonly SentenciaSql[]): Promise<void> {
    await this.ejecutarLote(await this.obtenerConexion(), sentencias);
  }

  private async obtenerConexion(): Promise<SQLiteDBConnection> {
    await this.iniciar();
    if (!this.conexion) {
      throw new Error('La base de datos local no está disponible.');
    }
    return this.conexion;
  }

  /** Protegido solo para poder simular una apertura colgada en las pruebas. */
  protected async abrirYMigrar(): Promise<void> {
    if (this.esWeb) {
      await this.prepararWeb();
    }
    const conexion = await this.abrirConexion();
    // Las migraciones usan la conexión directamente: `obtenerConexion` esperaría a
    // esta misma inicialización.
    await aplicarMigraciones(
      {
        ejecutar: (sql, parametros) => this.ejecutarEn(conexion, sql, parametros),
        consultar: <T extends object>(sql: string, parametros?: readonly ValorSql[]) =>
          this.consultarEn<T>(conexion, sql, parametros),
        ejecutarTransaccion: (sentencias) => this.ejecutarLote(conexion, sentencias),
      },
      MIGRACIONES_LOCALES,
    );
    this.conexion = conexion;
  }

  private async ejecutarEn(
    conexion: SQLiteDBConnection,
    sql: string,
    parametros: readonly ValorSql[] = [],
  ): Promise<ResultadoEjecucion> {
    const resultado = await conexion.run(sql, [...parametros], true);
    await this.guardarEnWeb();
    return {
      cambios: resultado.changes?.changes ?? 0,
      ultimoId: resultado.changes?.lastId ?? null,
    };
  }

  private async consultarEn<T extends object>(
    conexion: SQLiteDBConnection,
    sql: string,
    parametros: readonly ValorSql[] = [],
  ): Promise<T[]> {
    const resultado = await conexion.query(sql, [...parametros]);
    return (resultado.values ?? []) as T[];
  }

  private async abrirConexion(): Promise<SQLiteDBConnection> {
    const consistencia = await this.sqlite.checkConnectionsConsistency();
    const existe = (await this.sqlite.isConnection(NOMBRE_BASE_DATOS, false)).result;
    const conexion =
      consistencia.result && existe
        ? await this.sqlite.retrieveConnection(NOMBRE_BASE_DATOS, false)
        : await this.sqlite.createConnection(NOMBRE_BASE_DATOS, false, 'no-encryption', 1, false);
    await conexion.open();
    return conexion;
  }

  private async ejecutarLote(
    conexion: SQLiteDBConnection,
    sentencias: readonly SentenciaSql[],
  ): Promise<void> {
    if (sentencias.length === 0) {
      return;
    }
    await conexion.executeSet(
      sentencias.map((sentencia) => ({
        statement: sentencia.sql,
        values: [...(sentencia.parametros ?? [])],
      })),
      true,
    );
    await this.guardarEnWeb();
  }

  /** Registra el componente web jeep-sqlite y prepara el almacén en IndexedDB. */
  private async prepararWeb(): Promise<void> {
    const { defineCustomElements } = await import('jeep-sqlite/loader');
    defineCustomElements(window);
    if (!document.querySelector('jeep-sqlite')) {
      const elemento = document.createElement('jeep-sqlite');
      elemento.setAttribute('wasmpath', RUTA_WASM_WEB);
      document.body.appendChild(elemento);
    }
    await customElements.whenDefined('jeep-sqlite');
    await this.sqlite.initWebStore();
  }

  /** En la web, los cambios viven en memoria hasta copiarlos a IndexedDB. */
  private async guardarEnWeb(): Promise<void> {
    if (this.esWeb) {
      await this.sqlite.saveToStore(NOMBRE_BASE_DATOS);
    }
  }
}
