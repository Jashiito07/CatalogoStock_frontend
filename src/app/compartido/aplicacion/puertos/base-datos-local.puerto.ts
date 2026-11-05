/**
 * Puerto de la base de datos local del dispositivo (SQLite).
 *
 * La UI lee y escribe primero aquí y sincroniza después (RNF-06). Los casos de uso
 * dependen de esta interfaz; el adaptador concreto vive en `compartido/infraestructura`.
 */
export type ValorSql = string | number | null;

export interface SentenciaSql {
  readonly sql: string;
  readonly parametros?: readonly ValorSql[];
}

export interface ResultadoEjecucion {
  /** Filas afectadas por la sentencia. */
  readonly cambios: number;
  /** Último identificador insertado, si el motor lo informa. */
  readonly ultimoId: number | null;
}

/** Operaciones mínimas para ejecutar SQL; las usan los repositorios y las migraciones. */
export interface EjecutorSql {
  ejecutar(sql: string, parametros?: readonly ValorSql[]): Promise<ResultadoEjecucion>;
  consultar<T extends object>(sql: string, parametros?: readonly ValorSql[]): Promise<T[]>;
  /** Ejecuta todas las sentencias en una sola transacción: o se aplican todas o ninguna. */
  ejecutarTransaccion(sentencias: readonly SentenciaSql[]): Promise<void>;
}

export interface BaseDatosLocal extends EjecutorSql {
  /** Abre la base y aplica las migraciones pendientes. Es idempotente. */
  iniciar(): Promise<void>;
}
