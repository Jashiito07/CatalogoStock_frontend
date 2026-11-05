/**
 * Migraciones locales de SQLite, numeradas y aplicadas en orden al arrancar.
 *
 * Reglas:
 * - Nunca modifiques una migración ya publicada: agrega una nueva (002-…, 003-…).
 * - Nunca borres datos del usuario (carrito, guardados, cola de cambios) en una migración.
 * - El dinero se guarda como texto decimal y se calcula con `Dinero`.
 */
export interface MigracionLocal {
  readonly version: number;
  readonly nombre: string;
  readonly sentencias: readonly string[];
}

export const MIGRACIONES_LOCALES: readonly MigracionLocal[] = [
  {
    version: 1,
    nombre: '001-inicial',
    sentencias: [
      `CREATE TABLE IF NOT EXISTS metadatos (
        clave TEXT PRIMARY KEY NOT NULL,
        valor TEXT NOT NULL
      )`,
    ],
  },
];
