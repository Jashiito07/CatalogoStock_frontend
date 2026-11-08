import { conTiempoLimite, ErrorTiempoAgotado } from './tiempo-limite';

describe('conTiempoLimite', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('devuelve el resultado si la operación termina antes del límite', async () => {
    await expect(conTiempoLimite(Promise.resolve(7), 1000, 'x')).resolves.toBe(7);
  });

  it('propaga el error de la operación', async () => {
    await expect(conTiempoLimite(Promise.reject(new Error('falló')), 1000, 'x')).rejects.toThrow(
      'falló',
    );
  });

  it('una operación colgada se rechaza con un error claro al vencer el límite', async () => {
    let error: unknown = null;
    conTiempoLimite(new Promise<void>(() => undefined), 1000, 'No respondió.').catch(
      (e: unknown) => (error = e),
    );

    await vi.advanceTimersByTimeAsync(999);
    expect(error).toBeNull();

    await vi.advanceTimersByTimeAsync(1);
    expect(error).toBeInstanceOf(ErrorTiempoAgotado);
    expect((error as Error).message).toBe('No respondió.');
  });
});
