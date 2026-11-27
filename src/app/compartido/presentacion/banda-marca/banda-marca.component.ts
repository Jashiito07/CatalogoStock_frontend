import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonDirective } from 'primeng/button';

import { VistaMarca } from '../vistas';

/**
 * Banner de marca a todo el ancho: su color, su nombre en serifa y, si la marca tiene
 * acento, una franja inferior (D-43). Con `conVerTodo` ofrece «Ver todo» (la alternativa
 * sin gesto al carrusel).
 */
@Component({
  selector: 'app-banda-marca',
  imports: [ButtonDirective],
  templateUrl: './banda-marca.component.html',
  styleUrl: './banda-marca.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandaMarcaComponent {
  readonly marca = input.required<VistaMarca>();
  /** Línea pequeña sobre el nombre, por ejemplo «118 productos». */
  readonly detalle = input<string>('');
  readonly conVerTodo = input(false);
  readonly verTodo = output<void>();
}
