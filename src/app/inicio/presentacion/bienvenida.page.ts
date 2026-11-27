import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Avatar } from 'primeng/avatar';
import { ButtonDirective } from 'primeng/button';
import { Message } from 'primeng/message';

import { LogoComponent } from '../../compartido/presentacion/logo/logo.component';
import { SelectorTemaComponent } from '../../compartido/presentacion/selector-tema/selector-tema.component';
import { ConsultarEstadoBaseLocal } from '../aplicacion/casos-uso/consultar-estado-base-local.caso-uso';
import { proveerInicio } from '../inicio.providers';

/** Círculo decorativo del collage: marca conocida (D-43), posición y tamaño. */
interface CirculoCollage {
  /** Clase `cs-marca--*` con los colores de la marca (utilidades.css). */
  readonly clase: string;
  readonly iniciales: string;
  readonly x: string;
  readonly y: string;
  readonly diametro: string;
}

/**
 * Bienvenida del Cliente sin sesión (PLAN 1.6, PA-12): lleva al registro o al ingreso.
 * Comprueba en segundo plano que la base local abre (RNF-06) y solo avisa si falla.
 * Solo presenta funciones que ya existen: catálogo, uso sin conexión y tema.
 */
@Component({
  selector: 'app-bienvenida',
  imports: [
    IonContent,
    RouterLink,
    LogoComponent,
    SelectorTemaComponent,
    ButtonDirective,
    Avatar,
    Message,
  ],
  providers: [proveerInicio()],
  templateUrl: './bienvenida.page.html',
  styleUrl: './bienvenida.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BienvenidaPage implements OnInit {
  private readonly consultarEstadoBaseLocal = inject(ConsultarEstadoBaseLocal);

  /** `null` mientras se comprueba. */
  protected readonly baseLocalDisponible = signal<boolean | null>(null);

  protected readonly marcas: readonly CirculoCollage[] = [
    { clase: 'cs-marca--yanbal', iniciales: 'YA', x: '28%', y: '42%', diametro: '5.5rem' },
    { clase: 'cs-marca--avon', iniciales: 'AV', x: '62%', y: '20%', diametro: '4.25rem' },
    { clase: 'cs-marca--lbel', iniciales: 'LB', x: '71%', y: '64%', diametro: '4.75rem' },
    { clase: 'cs-marca--cyzone', iniciales: 'CY', x: '12%', y: '18%', diametro: '3.25rem' },
    { clase: 'cs-marca--esika', iniciales: 'ES', x: '45%', y: '84%', diametro: '3.5rem' },
    { clase: 'cs-marca--leonisa', iniciales: 'LE', x: '91%', y: '28%', diametro: '3rem' },
  ];

  ngOnInit(): void {
    void this.comprobarBaseLocal();
  }

  protected async comprobarBaseLocal(): Promise<void> {
    const resultado = await this.consultarEstadoBaseLocal.ejecutar();
    this.baseLocalDisponible.set(resultado.disponible);
  }
}
