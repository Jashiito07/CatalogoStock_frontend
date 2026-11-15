import { DestroyRef } from '@angular/core';

import { CuentaRegresiva, formatearEspera } from './cuenta-regresiva';

describe('CuentaRegresiva (espera para reenviar el código)', () => {
  let destruir: (() => void) | undefined;
  const destroyRef = { onDestroy: (f: () => void) => (destruir = f) } as unknown as DestroyRef;

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('cuenta hacia atrás cada segundo y se detiene en 0', () => {
    const cuenta = new CuentaRegresiva(destroyRef);

    cuenta.iniciar(3);
    expect(cuenta.segundos()).toBe(3);
    vi.advanceTimersByTime(1000);
    expect(cuenta.segundos()).toBe(2);
    vi.advanceTimersByTime(5000);
    expect(cuenta.segundos()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reiniciar reemplaza la cuenta anterior', () => {
    const cuenta = new CuentaRegresiva(destroyRef);

    cuenta.iniciar(10);
    cuenta.iniciar(60);
    vi.advanceTimersByTime(1000);

    expect(cuenta.segundos()).toBe(59);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('al destruir el componente libera el temporizador', () => {
    const cuenta = new CuentaRegresiva(destroyRef);
    cuenta.iniciar(10);

    destruir?.();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('formatearEspera: m:ss', () => {
    expect(formatearEspera(60)).toBe('1:00');
    expect(formatearEspera(75)).toBe('1:15');
    expect(formatearEspera(5)).toBe('0:05');
  });
});
