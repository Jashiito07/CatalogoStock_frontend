import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Avatar } from 'primeng/avatar';

import { VistaMarca } from '../vistas';

/** Iniciales de la marca: «Yanbal» → «YA», «L'Bel» → «LB». */
export function inicialesDeMarca(nombre: string): string {
  const palabras = nombre.split(/[^\p{L}\p{N}]+/u).filter((p) => p.length > 0);
  if (palabras.length >= 2) return palabras.map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (palabras[0] ?? '?').slice(0, 2).toUpperCase();
}

/**
 * Círculo de marca de las «historias»: iniciales sobre el color de la marca y su nombre
 * debajo. Es un botón con `aria-pressed`; el estado activo se ve también por el anillo.
 */
@Component({
  selector: 'app-circulo-marca',
  imports: [Avatar],
  templateUrl: './circulo-marca.component.html',
  styleUrl: './circulo-marca.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CirculoMarcaComponent {
  readonly marca = input.required<VistaMarca>();
  readonly activo = input(false);
  readonly seleccionar = output<void>();

  protected readonly iniciales = computed(() => inicialesDeMarca(this.marca().nombre));
}
