import {
  EjecutorSql,
  ResultadoEjecucion,
  SentenciaSql,
  ValorSql,
} from '../../aplicacion/puertos/base-datos-local.puerto';
import { aplicarMigraciones, ErrorMigracion } from './aplicar-migraciones';
import { MIGRACIONES_LOCALES, MigracionLocal } from './migraciones-locales';

/** Ejecutor falso que simula solo lo que usan las migraciones: la tabla metadatos. */
class EjecutorFalso implements EjecutorSql {
  existeMetadatos = false;
  versionGuardada: string | null = null;
  readonly transacciones: SentenciaSql[][] = [];

  async ejecutar(): Promise<ResultadoEjecucion> {
    return { cambios: 0, ultimoId: null };
  }

  async consultar<T extends object>(sql: string): Promise<T[]> {
    if (sql.includes('sqlite_master')) {
      return (this.existeMetadatos ? [{ name: 'metadatos' }] : []) as T[];
    }
    return (this.versionGuardada === null ? [] : [{ valor: this.versionGuardada }]) as T[];
  }

  async ejecutarTransaccion(sentencias: readonly SentenciaSql[]): Promise<void> {
    this.transacciones.push([...sentencias]);
    if (sentencias.some((s) => s.sql.includes('CREATE TABLE IF NOT EXISTS metadatos'))) {
      this.existeMetadatos = true;
    }
    const registro = sentencias.find((s) => s.sql.startsWith('INSERT INTO metadatos'));
    const parametros: readonly ValorSql[] = registro?.parametros ?? [];
    if (registro) {
      this.versionGuardada = String(parametros[1]);
    }
  }
}

describe('aplicarMigraciones', () => {
  it('en una base nueva aplica 001-inicial, crea metadatos y registra la versión', async () => {
    const ejecutor = new EjecutorFalso();

    const version = await aplicarMigraciones(ejecutor, MIGRACIONES_LOCALES);

    expect(version).toBe(1);
    expect(ejecutor.transacciones).toHaveLength(1);
    expect(ejecutor.existeMetadatos).toBe(true);
    expect(ejecutor.versionGuardada).toBe('1');
  });

  it('no vuelve a aplicar migraciones ya registradas (idempotente)', async () => {
    const ejecutor = new EjecutorFalso();
    await aplicarMigraciones(ejecutor, MIGRACIONES_LOCALES);

    await aplicarMigraciones(ejecutor, MIGRACIONES_LOCALES);

    expect(ejecutor.transacciones).toHaveLength(1);
  });

  it('aplica solo las migraciones pendientes, en orden', async () => {
    const ejecutor = new EjecutorFalso();
    await aplicarMigraciones(ejecutor, MIGRACIONES_LOCALES);
    const conNueva: MigracionLocal[] = [
      ...MIGRACIONES_LOCALES,
      { version: 2, nombre: '002-prueba', sentencias: ['CREATE TABLE prueba (id TEXT)'] },
    ];

    const version = await aplicarMigraciones(ejecutor, conNueva);

    expect(version).toBe(2);
    expect(ejecutor.transacciones).toHaveLength(2);
    expect(ejecutor.transacciones[1][0].sql).toBe('CREATE TABLE prueba (id TEXT)');
    expect(ejecutor.versionGuardada).toBe('2');
  });

  it('rechaza migraciones con numeración no consecutiva', async () => {
    const saltada: MigracionLocal[] = [{ version: 2, nombre: '002-saltada', sentencias: [] }];

    await expect(aplicarMigraciones(new EjecutorFalso(), saltada)).rejects.toThrow(ErrorMigracion);
  });

  it('rechaza una base local más nueva que la app', async () => {
    const ejecutor = new EjecutorFalso();
    ejecutor.existeMetadatos = true;
    ejecutor.versionGuardada = '5';

    await expect(aplicarMigraciones(ejecutor, MIGRACIONES_LOCALES)).rejects.toThrow(ErrorMigracion);
  });
});
