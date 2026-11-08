import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Badge } from 'primeng/badge';
import { ButtonDirective } from 'primeng/button';
import { Card } from 'primeng/card';
import { Message } from 'primeng/message';

import { ConsultarEstadoBaseLocal } from '../aplicacion/casos-uso/consultar-estado-base-local.caso-uso';
import { proveerInicio } from '../inicio.providers';

/**
 * Bienvenida del Cliente sin sesión (PLAN 1.6, PA-12): lleva al registro o al ingreso.
 * Comprueba en segundo plano que la base local abre (RNF-06) y solo avisa si falla.
 */
@Component({
  selector: 'app-bienvenida',
  imports: [IonContent, RouterLink, Card, ButtonDirective, Badge, Message],
  providers: [proveerInicio()],
  templateUrl: './bienvenida.page.html',
  styleUrl: './bienvenida.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BienvenidaPage implements OnInit {
  private readonly consultarEstadoBaseLocal = inject(ConsultarEstadoBaseLocal);

  /** `null` mientras se comprueba. */
  protected readonly baseLocalDisponible = signal<boolean | null>(null);

  ngOnInit(): void {
    void this.comprobarBaseLocal();
  }

  protected async comprobarBaseLocal(): Promise<void> {
    const resultado = await this.consultarEstadoBaseLocal.ejecutar();
    this.baseLocalDisponible.set(resultado.disponible);
  }
}
