import { DOCUMENT } from '@angular/common';
import { inject, Injectable, InjectionToken, isDevMode, OnDestroy, signal } from '@angular/core';

import { AlmacenPreferenciaTema } from '../../aplicacion/puertos/preferencia-tema.puerto';
import {
  esPreferenciaTema,
  minutosDelDia,
  PREFERENCIA_TEMA_POR_DEFECTO,
  PreferenciaTema,
  resolverTema,
  TemaAplicado,
} from '../../dominio/tema';

/** Puerto donde se guarda la preferencia de tema (adaptador: tabla local `metadatos`). */
export const ALMACEN_PREFERENCIA_TEMA = new InjectionToken<AlmacenPreferenciaTema>(
  'ALMACEN_PREFERENCIA_TEMA',
);

/** Reloj del dispositivo; las pruebas lo sustituyen. */
export const AHORA = new InjectionToken<() => Date>('AHORA', {
  providedIn: 'root',
  factory: () => () => new Date(),
});

/** Clase que activa el modo oscuro de PrimeNG (`darkModeSelector`) y las variables `--cs-*`. */
export const CLASE_TEMA_OSCURO = 'app-oscuro';
/** Cada cuánto se revisa la hora con la app abierta. */
export const INTERVALO_REVISION_TEMA_MS = 30_000;
/** Espera máxima de la preferencia guardada antes de mostrar la primera pantalla. */
export const ESPERA_PREFERENCIA_MS = 400;

/** Parámetro de depuración (`?tema=oscuro`): solo se acepta fuera de producción. */
const PARAMETRO_DEPURACION = 'tema';

/**
 * Aplica el tema claro u oscuro (N2). «Automático» sigue la hora local del dispositivo:
 * oscuro de 18:40 a 06:45. Revisa cada 30 s y al volver a primer plano.
 */
@Injectable({ providedIn: 'root' })
export class ServicioTema implements OnDestroy {
  private readonly documento = inject(DOCUMENT);
  private readonly ahora = inject(AHORA);
  private readonly almacen = inject(ALMACEN_PREFERENCIA_TEMA, { optional: true });

  readonly preferencia = signal<PreferenciaTema>(PREFERENCIA_TEMA_POR_DEFECTO);
  readonly temaAplicado = signal<TemaAplicado>('claro');

  private temporizador: ReturnType<typeof setInterval> | null = null;
  private readonly alCambiarVisibilidad = () => {
    if (this.documento.visibilityState !== 'hidden') this.revisar();
  };
  private depuracion: PreferenciaTema | null = null;
  private destruido = false;

  /**
   * Aplica el tema de inmediato con el cálculo automático (sin esperar a SQLite), programa
   * la revisión y carga la preferencia guardada. Si SQLite tarda más de
   * `ESPERA_PREFERENCIA_MS`, sigue en segundo plano y corrige al llegar.
   */
  async iniciar(): Promise<void> {
    this.depuracion = this.leerParametroDepuracion();
    this.revisar();
    this.programar();
    const carga = this.cargarPreferencia();
    let espera: ReturnType<typeof setTimeout> | undefined;
    const limite = new Promise<void>((resolver) => {
      espera = setTimeout(resolver, ESPERA_PREFERENCIA_MS);
    });
    try {
      await Promise.race([carga, limite]);
    } finally {
      clearTimeout(espera);
    }
  }

  /** Cambia y guarda la preferencia del Cliente. */
  async seleccionar(preferencia: PreferenciaTema): Promise<void> {
    this.preferencia.set(preferencia);
    this.depuracion = null;
    this.revisar();
    try {
      await this.almacen?.guardar(preferencia);
    } catch {
      // Sin almacenamiento local la elección vale solo durante esta sesión.
    }
  }

  /** Recalcula el tema con la hora actual y lo aplica. */
  revisar(): void {
    const preferencia = this.depuracion ?? this.preferencia();
    const tema = resolverTema(preferencia, minutosDelDia(this.ahora()));
    this.temaAplicado.set(tema);
    this.aplicar(tema);
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (this.temporizador !== null) clearInterval(this.temporizador);
    this.temporizador = null;
    this.documento.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
  }

  private programar(): void {
    if (this.temporizador !== null || this.destruido) return;
    this.temporizador = setInterval(() => this.revisar(), INTERVALO_REVISION_TEMA_MS);
    this.documento.addEventListener('visibilitychange', this.alCambiarVisibilidad);
  }

  private async cargarPreferencia(): Promise<void> {
    try {
      const guardada = await this.almacen?.leer();
      if (guardada && !this.destruido) {
        this.preferencia.set(guardada);
        this.revisar();
      }
    } catch {
      // Sin lectura se conserva «automático».
    }
  }

  private leerParametroDepuracion(): PreferenciaTema | null {
    if (!isDevMode()) return null;
    const busqueda = this.documento.defaultView?.location.search ?? '';
    const valor = new URLSearchParams(busqueda).get(PARAMETRO_DEPURACION);
    return esPreferenciaTema(valor) ? valor : null;
  }

  private aplicar(tema: TemaAplicado): void {
    const raiz = this.documento.documentElement;
    raiz.classList.toggle(CLASE_TEMA_OSCURO, tema === 'oscuro');
    this.actualizarColorBarra(raiz);
  }

  /** `<meta name="theme-color">` con el fondo del tema, leído de la variable `--cs-fondo`. */
  private actualizarColorBarra(raiz: HTMLElement): void {
    const vista = this.documento.defaultView;
    const fondo = vista?.getComputedStyle(raiz).getPropertyValue('--cs-fondo').trim();
    if (!fondo) return;
    let meta = this.documento.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = this.documento.createElement('meta');
      meta.name = 'theme-color';
      this.documento.head.appendChild(meta);
    }
    meta.content = fondo;
  }
}
