import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';
import { ButtonDirective } from 'primeng/button';
import { Drawer } from 'primeng/drawer';

import { EtiquetaEstadoComponent } from '../etiqueta-estado/etiqueta-estado.component';
import { VistaProducto } from '../vistas';

/**
 * Detalle del producto como hoja inferior (`p-drawer` abajo, modal). Se cierra con el botón
 * ✕, con Esc y tocando fuera; PrimeNG administra el foco. Muestra solo datos que el sistema
 * tiene: foto, marca, nombre, precio, disponibilidad y descripción. El carrito llega en una
 * fase posterior: el botón queda deshabilitado con «Próximamente».
 */
@Component({
  selector: 'app-hoja-producto',
  imports: [Drawer, ButtonDirective, EtiquetaEstadoComponent],
  templateUrl: './hoja-producto.component.html',
  styleUrl: './hoja-producto.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HojaProductoComponent {
  readonly producto = input<VistaProducto | null>(null);
  readonly visible = model(false);

  private readonly urlFallida = signal<string | null>(null);

  protected imagenVisible(): string | null {
    const url = this.producto()?.imagenUrl ?? null;
    return url !== null && url !== this.urlFallida() ? url : null;
  }

  protected alFallarImagen(): void {
    this.urlFallida.set(this.producto()?.imagenUrl ?? null);
  }
}
