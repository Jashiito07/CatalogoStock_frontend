import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

import { BarraEstado } from '../aplicacion/puertos/barra-estado.puerto';
import { TemaAplicado } from '../dominio/tema';

/** Operaciones del plugin que se usan (permite sustituirlo en las pruebas). */
export interface PluginBarraEstado {
  setStyle(opciones: { style: Style }): Promise<void>;
  setBackgroundColor(opciones: { color: string }): Promise<void>;
  setOverlaysWebView(opciones: { overlay: boolean }): Promise<void>;
}

/**
 * Adaptador de la barra de estado con `@capacitor/status-bar`. Solo actúa en plataforma
 * nativa; en el navegador no hace nada. Si el plugin falla, el error se ignora.
 * `Style.Dark` = íconos claros (fondo oscuro); `Style.Light` = íconos oscuros (fondo claro).
 */
export class BarraEstadoCapacitor implements BarraEstado {
  constructor(
    private readonly plugin: PluginBarraEstado = StatusBar,
    private readonly esNativa: () => boolean = () => Capacitor.isNativePlatform(),
  ) {}

  /** Cola de aplicaciones: evita que dos cambios seguidos se crucen y gane el anterior. */
  private cola: Promise<void> = Promise.resolve();

  aplicar(tema: TemaAplicado, colorFondo: string): Promise<void> {
    if (!this.esNativa()) return Promise.resolve();
    this.cola = this.cola.then(() => this.aplicarAhora(tema, colorFondo));
    return this.cola;
  }

  private async aplicarAhora(tema: TemaAplicado, colorFondo: string): Promise<void> {
    try {
      await this.plugin.setOverlaysWebView({ overlay: false });
      await this.plugin.setStyle({ style: tema === 'oscuro' ? Style.Dark : Style.Light });
      if (colorFondo) await this.plugin.setBackgroundColor({ color: colorFondo });
    } catch {
      // Plugin no disponible: la app sigue con la barra por defecto.
    }
  }
}
