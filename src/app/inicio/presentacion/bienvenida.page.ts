import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { IonContent } from '@ionic/angular';
import { MessageService } from 'primeng/api';
import { Badge } from 'primeng/badge';
import { ButtonDirective } from 'primeng/button';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

import {
  ConsultarEstadoBaseLocal,
  EstadoBaseLocal,
} from '../aplicacion/casos-uso/consultar-estado-base-local.caso-uso';
import { proveerInicio } from '../inicio.providers';

type EstadoVerificacion =
  | { readonly tipo: 'comprobando' }
  | ({ readonly tipo: 'listo' } & EstadoBaseLocal);

interface EtiquetaEstado {
  readonly severidad: 'info' | 'success' | 'danger';
  readonly texto: string;
}

/**
 * Pantalla inicial de verificación de la base técnica (F0): comprueba el tema
 * corporativo (D-06) y que la base local SQLite abre sin conexión (RNF-06).
 */
@Component({
  selector: 'app-bienvenida',
  imports: [IonContent, Card, ButtonDirective, Badge, Tag],
  providers: [proveerInicio()],
  templateUrl: './bienvenida.page.html',
  styleUrl: './bienvenida.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BienvenidaPage implements OnInit {
  private readonly consultarEstadoBaseLocal = inject(ConsultarEstadoBaseLocal);
  private readonly mensajes = inject(MessageService);

  protected readonly estado = signal<EstadoVerificacion>({ tipo: 'comprobando' });

  protected readonly etiquetaEstado = computed((): EtiquetaEstado => {
    const estado = this.estado();
    if (estado.tipo === 'comprobando') {
      return { severidad: 'info', texto: 'Comprobando la base local…' };
    }
    return estado.disponible
      ? { severidad: 'success', texto: `Base local lista (esquema v${estado.versionEsquema})` }
      : { severidad: 'danger', texto: 'No se pudo abrir la base local' };
  });

  ngOnInit(): void {
    void this.comprobarBaseLocal();
  }

  protected async comprobarBaseLocal(): Promise<void> {
    this.estado.set({ tipo: 'comprobando' });
    const resultado = await this.consultarEstadoBaseLocal.ejecutar();
    this.estado.set({ tipo: 'listo', ...resultado });
  }

  protected async alPulsarComprobar(): Promise<void> {
    await this.comprobarBaseLocal();
    const estado = this.estado();
    const disponible = estado.tipo === 'listo' && estado.disponible;
    this.mensajes.add({
      severity: disponible ? 'success' : 'error',
      summary: disponible ? 'Base local lista' : 'No se pudo abrir la base local',
      detail: disponible
        ? 'Tus datos se guardan en este dispositivo.'
        : 'Cierra y vuelve a abrir la aplicación. Si continúa, contacta al vendedor.',
      life: 3000,
    });
  }

  protected mostrarProximamente(): void {
    this.mensajes.add({
      severity: 'info',
      summary: 'Muy pronto',
      detail: 'Aquí podrás explorar el catálogo de productos.',
      life: 3000,
    });
  }
}
