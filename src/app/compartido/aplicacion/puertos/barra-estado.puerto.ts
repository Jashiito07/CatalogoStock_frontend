import { TemaAplicado } from '../../dominio/tema';

/** Barra de estado nativa del dispositivo (adaptador: `@capacitor/status-bar`). */
export interface BarraEstado {
  /**
   * Pinta la barra con el color de fondo del tema y los íconos legibles sobre él:
   * íconos claros en oscuro, íconos oscuros en claro. No lanza errores; sin soporte no hace nada.
   */
  aplicar(tema: TemaAplicado, colorFondo: string): Promise<void>;
}
