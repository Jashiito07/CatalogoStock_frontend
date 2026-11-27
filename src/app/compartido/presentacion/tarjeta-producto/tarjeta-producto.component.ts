import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import { EtiquetaEstadoComponent } from '../etiqueta-estado/etiqueta-estado.component';
import { VistaProducto } from '../vistas';

/**
 * Tarjeta de producto (imagen 4:5, nombre, precio y disponibilidad). Toda la tarjeta es un
 * botón que abre el detalle. No decide precio ni disponibilidad: los muestra (RN-07, RN-09).
 * La imagen se carga de forma diferida y, si falta o falla, se ve un marcador.
 */
@Component({
  selector: 'app-tarjeta-producto',
  imports: [EtiquetaEstadoComponent],
  templateUrl: './tarjeta-producto.component.html',
  styleUrl: './tarjeta-producto.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarjetaProductoComponent {
  readonly producto = input.required<VistaProducto>();
  readonly abrir = output<void>();

  private readonly urlFallida = signal<string | null>(null);

  protected imagenVisible(): string | null {
    const url = this.producto().imagenUrl;
    return url !== null && url !== this.urlFallida() ? url : null;
  }

  protected alFallarImagen(): void {
    this.urlFallida.set(this.producto().imagenUrl);
  }
}
