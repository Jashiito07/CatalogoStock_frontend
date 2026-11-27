import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonDirective } from 'primeng/button';

import { OpcionChip } from '../vistas';

/**
 * Grupo de chips de filtro (píldoras de al menos 44 px) con `aria-pressed`. El activo se
 * distingue por color y también por forma (sube y se rellena). Se desplaza en horizontal.
 */
@Component({
  selector: 'app-chips-filtro',
  imports: [ButtonDirective],
  templateUrl: './chips-filtro.component.html',
  styleUrl: './chips-filtro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipsFiltroComponent {
  readonly opciones = input.required<readonly OpcionChip[]>();
  readonly valor = input<string | null>(null);
  readonly etiqueta = input('Filtrar');
  readonly cambiar = output<string | null>();
}
