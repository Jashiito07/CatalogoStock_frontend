import { DestroyRef, signal } from '@angular/core';

/** Segundos que se espera antes de poder pedir otro código (3 envíos por hora, correo.md). */
export const ESPERA_REENVIO_SEGUNDOS = 60;

/**
 * Cuenta regresiva en segundos para habilitar «Reenviar código». Se detiene sola al
 * llegar a 0 y al destruirse el componente que la creó.
 */
export class CuentaRegresiva {
  readonly segundos = signal(0);
  private temporizador: ReturnType<typeof setInterval> | null = null;

  constructor(destroyRef: DestroyRef) {
    destroyRef.onDestroy(() => this.detener());
  }

  iniciar(segundos: number): void {
    this.detener();
    this.segundos.set(Math.max(0, Math.ceil(segundos)));
    if (this.segundos() === 0) return;
    this.temporizador = setInterval(() => {
      const restante = this.segundos() - 1;
      this.segundos.set(Math.max(0, restante));
      if (restante <= 0) this.detener();
    }, 1000);
  }

  detener(): void {
    if (this.temporizador !== null) clearInterval(this.temporizador);
    this.temporizador = null;
  }
}

/** `75` → `1:15`. */
export function formatearEspera(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const resto = String(segundos % 60).padStart(2, '0');
  return `${minutos}:${resto}`;
}
