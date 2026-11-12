import { TestBed } from '@angular/core/testing';

import { AlmacenPreferenciaTema } from '../../aplicacion/puertos/preferencia-tema.puerto';
import { PreferenciaTema } from '../../dominio/tema';
import {
  AHORA,
  ALMACEN_PREFERENCIA_TEMA,
  CLASE_TEMA_OSCURO,
  ESPERA_PREFERENCIA_MS,
  INTERVALO_REVISION_TEMA_MS,
  ServicioTema,
} from './servicio-tema';

class AlmacenEnMemoria implements AlmacenPreferenciaTema {
  guardada: PreferenciaTema | null;
  retraso = 0;
  constructor(inicial: PreferenciaTema | null = null) {
    this.guardada = inicial;
  }
  async leer(): Promise<PreferenciaTema | null> {
    if (this.retraso > 0) await new Promise((r) => setTimeout(r, this.retraso));
    return this.guardada;
  }
  async guardar(preferencia: PreferenciaTema): Promise<void> {
    this.guardada = preferencia;
  }
}

describe('ServicioTema (N2)', () => {
  let hora: Date;
  let almacen: AlmacenEnMemoria;

  const hoyA = (h: number, m: number) => new Date(2026, 10, 10, h, m);
  const esOscuro = () => document.documentElement.classList.contains(CLASE_TEMA_OSCURO);

  function crear(inicial: PreferenciaTema | null = null): ServicioTema {
    almacen = new AlmacenEnMemoria(inicial);
    TestBed.configureTestingModule({
      providers: [
        { provide: AHORA, useValue: () => hora },
        { provide: ALMACEN_PREFERENCIA_TEMA, useValue: almacen },
      ],
    });
    return TestBed.inject(ServicioTema);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    hora = hoyA(12, 0);
    document.documentElement.classList.remove(CLASE_TEMA_OSCURO);
  });

  afterEach(() => {
    TestBed.inject(ServicioTema).ngOnDestroy();
    vi.useRealTimers();
    document.documentElement.classList.remove(CLASE_TEMA_OSCURO);
  });

  it('aplica el tema automático al iniciar: claro a las 12:00, oscuro a las 19:00', async () => {
    const servicio = crear();
    await servicio.iniciar();
    expect(servicio.temaAplicado()).toBe('claro');
    expect(esOscuro()).toBe(false);
  });

  it('arranca oscuro de noche', async () => {
    hora = hoyA(19, 0);
    const servicio = crear();
    await servicio.iniciar();
    expect(servicio.temaAplicado()).toBe('oscuro');
    expect(esOscuro()).toBe(true);
  });

  it('con la app abierta cambia solo cuando llega 18:40 (revisión cada 30 s)', async () => {
    hora = hoyA(18, 39);
    const servicio = crear();
    await servicio.iniciar();
    expect(esOscuro()).toBe(false);

    hora = hoyA(18, 40);
    vi.advanceTimersByTime(INTERVALO_REVISION_TEMA_MS);
    expect(servicio.temaAplicado()).toBe('oscuro');
    expect(esOscuro()).toBe(true);

    hora = hoyA(6, 45);
    vi.advanceTimersByTime(INTERVALO_REVISION_TEMA_MS);
    expect(servicio.temaAplicado()).toBe('claro');
    expect(esOscuro()).toBe(false);
  });

  it('al volver a primer plano (visibilitychange) revisa la hora de inmediato', async () => {
    hora = hoyA(18, 0);
    const servicio = crear();
    await servicio.iniciar();
    expect(esOscuro()).toBe(false);

    hora = hoyA(20, 0);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(servicio.temaAplicado()).toBe('oscuro');
  });

  it('la preferencia guardada gana sobre el horario', async () => {
    hora = hoyA(23, 0);
    const servicio = crear('claro');
    await servicio.iniciar();
    expect(servicio.preferencia()).toBe('claro');
    expect(esOscuro()).toBe(false);
  });

  it('si SQLite tarda, usa el cálculo automático y corrige al llegar la preferencia', async () => {
    hora = hoyA(23, 0);
    const servicio = crear('claro');
    almacen.retraso = ESPERA_PREFERENCIA_MS * 3;
    const inicio = servicio.iniciar();
    await vi.advanceTimersByTimeAsync(ESPERA_PREFERENCIA_MS);
    await inicio;
    expect(esOscuro()).toBe(true); // automático mientras tanto

    await vi.advanceTimersByTimeAsync(ESPERA_PREFERENCIA_MS * 3);
    expect(esOscuro()).toBe(false); // corregido a «claro»
  });

  it('seleccionar guarda la preferencia y aplica el tema', async () => {
    const servicio = crear();
    await servicio.iniciar();
    await servicio.seleccionar('oscuro');
    expect(esOscuro()).toBe(true);
    expect(almacen.guardada).toBe('oscuro');

    await servicio.seleccionar('automatico');
    expect(esOscuro()).toBe(false); // 12:00
    expect(almacen.guardada).toBe('automatico');
  });

  it('al destruirse limpia el temporizador y deja de oír visibilitychange', async () => {
    const servicio = crear();
    await servicio.iniciar();
    expect(vi.getTimerCount()).toBe(1);

    servicio.ngOnDestroy();
    expect(vi.getTimerCount()).toBe(0);

    hora = hoyA(23, 0);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(esOscuro()).toBe(false);
  });
});
