import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Tag } from 'primeng/tag';

import { TipoEstado } from '../vistas';

/**
 * Etiqueta de estado con texto e ícono (RNF-11: el estado nunca va solo en color).
 * Los tonos salen de las variables `--cs-ok`, `--cs-warn`, `--cs-mal` e `--cs-info`.
 */
@Component({
  selector: 'app-etiqueta-estado',
  imports: [Tag],
  template: `<p-tag [class]="clase()" [icon]="icono()" [value]="texto()" />`,
  styles: `
    :host {
      display: inline-flex;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EtiquetaEstadoComponent {
  readonly texto = input.required<string>();
  readonly icono = input<string>('');
  readonly tipo = input<TipoEstado>('info');

  protected readonly clase = computed(() => `cs-etiqueta cs-etiqueta--${this.tipo()}`);
}
