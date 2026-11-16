import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Avatar } from 'primeng/avatar';
import { Tag } from 'primeng/tag';

import {
  Disponibilidad,
  etiquetaDisponibilidad,
  imagenPrincipal,
  precioEnTexto,
  Producto,
} from '../dominio/producto';
import { textoLegibleSobre } from '../dominio/marca';

/** Íconos que acompañan al texto para no depender solo del color (RNF-11). */
const ICONO_DISPONIBILIDAD: Readonly<Record<Disponibilidad, string>> = {
  DISPONIBLE: 'pi pi-check-circle',
  AGOTADO: 'pi pi-ban',
  PENDIENTE_REPOSICION: 'pi pi-clock',
};

/**
 * Fila de la lista compacta (diseño B, D-42): miniatura, nombre, marca con su color,
 * precio y disponibilidad. Los agotados y pendientes de reposición se muestran con su
 * estado claro; no se ocultan (RN-09). No decide precios ni disponibilidad: los muestra.
 */
@Component({
  selector: 'app-fila-producto',
  imports: [Avatar, Tag],
  templateUrl: './fila-producto.component.html',
  styleUrl: './fila-producto.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilaProductoComponent {
  readonly producto = input.required<Producto>();

  private readonly imagenFallida = signal<string | null>(null);

  /** URL de la miniatura, o `null` si no hay imagen o no pudo cargarse (se ve el marcador). */
  protected readonly urlMiniatura = computed(() => {
    const url = imagenPrincipal(this.producto())?.url ?? null;
    return url !== null && url !== this.imagenFallida() ? url : null;
  });
  protected readonly precio = computed(() => precioEnTexto(this.producto().precio));
  protected readonly etiqueta = computed(() => etiquetaDisponibilidad(this.producto().disponibilidad));
  protected readonly icono = computed(() => ICONO_DISPONIBILIDAD[this.producto().disponibilidad]);
  protected readonly claseDisponibilidad = computed(
    () => `fila__estado fila__estado--${this.producto().disponibilidad.toLowerCase()}`,
  );
  protected readonly textoMarca = computed(() => {
    const marca = this.producto().marca;
    return textoLegibleSobre(marca.color, marca.textoSobreColor);
  });

  protected alFallarImagen(): void {
    this.imagenFallida.set(imagenPrincipal(this.producto())?.url ?? null);
  }
}
