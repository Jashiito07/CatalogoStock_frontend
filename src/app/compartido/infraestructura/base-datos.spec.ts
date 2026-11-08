import { BaseDatosSqlite, TIEMPO_LIMITE_INICIO_MS } from './base-datos';
import { ErrorTiempoAgotado } from './tiempo-limite';

/** Sustituye la apertura real por una controlada desde la prueba. */
class BaseDatosConAperturaSimulada extends BaseDatosSqlite {
  readonly aperturas: (() => Promise<void>)[] = [];
  intentos = 0;

  protected override abrirYMigrar(): Promise<void> {
    const apertura = this.aperturas[this.intentos] ?? (() => Promise.resolve());
    this.intentos++;
    return apertura();
  }
}

const colgada = (): Promise<void> => new Promise<void>(() => undefined);

describe('BaseDatosSqlite: inicialización con tiempo límite (RNF-06)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('si SQLite no arranca (promesa colgada), iniciar() se rechaza con un error claro al vencer el límite', async () => {
    const base = new BaseDatosConAperturaSimulada();
    base.aperturas.push(colgada);
    let error: unknown = null;
    base.iniciar().catch((e: unknown) => (error = e));

    await vi.advanceTimersByTimeAsync(TIEMPO_LIMITE_INICIO_MS - 1);
    expect(error).toBeNull();

    await vi.advanceTimersByTimeAsync(1);
    expect(error).toBeInstanceOf(ErrorTiempoAgotado);
    expect((error as Error).message).toBe('La base de datos local no respondió a tiempo.');
  });

  it('las operaciones también fallan en vez de quedar esperando para siempre', async () => {
    const base = new BaseDatosConAperturaSimulada();
    base.aperturas.push(colgada);
    let error: unknown = null;
    base.consultar('SELECT 1').catch((e: unknown) => (error = e));

    await vi.advanceTimersByTimeAsync(TIEMPO_LIMITE_INICIO_MS);

    expect(error).toBeInstanceOf(ErrorTiempoAgotado);
  });

  it('tras el tiempo agotado permite reintentar la apertura', async () => {
    const base = new BaseDatosConAperturaSimulada();
    base.aperturas.push(colgada, () => Promise.resolve());
    const primera = base.iniciar().catch(() => 'rechazada');
    await vi.advanceTimersByTimeAsync(TIEMPO_LIMITE_INICIO_MS);
    expect(await primera).toBe('rechazada');

    await expect(base.iniciar()).resolves.toBeUndefined();
    expect(base.intentos).toBe(2);
  });

  it('una apertura correcta se hace una sola vez', async () => {
    const base = new BaseDatosConAperturaSimulada();

    await base.iniciar();
    await base.iniciar();

    expect(base.intentos).toBe(1);
  });
});
