import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButton } from 'primeng/selectbutton';

import { PreferenciaTema } from '../../dominio/tema';
import { ServicioTema } from '../tema/servicio-tema';

interface OpcionTema {
  readonly etiqueta: string;
  readonly valor: PreferenciaTema;
  readonly icono: string;
}

/**
 * Selector de tema (Automático, Claro, Oscuro) para pantallas sin sesión, como la
 * bienvenida (N2). Usa el mismo `ServicioTema` que «Cuenta», así que la elección se guarda
 * en el dispositivo y vale también después de iniciar sesión.
 */
@Component({
  selector: 'app-selector-tema',
  imports: [FormsModule, SelectButton],
  template: `
    <p-selectbutton
      class="selector-tema"
      [options]="opciones"
      optionLabel="etiqueta"
      optionValue="valor"
      [allowEmpty]="false"
      ariaLabel="Tema de la aplicación"
      [ngModel]="preferencia()"
      (ngModelChange)="elegir($event)"
    >
      <ng-template #item let-opcion>
        <i [class]="opcion.icono" aria-hidden="true"></i>
        <span>{{ opcion.etiqueta }}</span>
      </ng-template>
    </p-selectbutton>
  `,
  styles: `
    :host {
      display: block;
    }

    :host ::ng-deep .p-selectbutton {
      display: flex;
      width: 100%;
    }

    /* RNF-10: cada opción mide al menos 48 px de alto y se reparte el ancho. */
    :host ::ng-deep .p-togglebutton {
      flex: 1;
      gap: var(--cs-espacio-1);
      min-height: var(--cs-control-minimo);
      padding-inline: var(--cs-espacio-2);
      font-size: var(--cs-texto-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorTemaComponent {
  private readonly tema = inject(ServicioTema);

  protected readonly opciones: OpcionTema[] = [
    { etiqueta: 'Automático', valor: 'automatico', icono: 'pi pi-desktop' },
    { etiqueta: 'Claro', valor: 'claro', icono: 'pi pi-sun' },
    { etiqueta: 'Oscuro', valor: 'oscuro', icono: 'pi pi-moon' },
  ];
  protected readonly preferencia = this.tema.preferencia;

  protected elegir(preferencia: PreferenciaTema | null): void {
    if (preferencia) void this.tema.seleccionar(preferencia);
  }
}
