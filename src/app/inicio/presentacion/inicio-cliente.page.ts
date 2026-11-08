import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Message } from 'primeng/message';
import { Tag } from 'primeng/tag';

import { CONECTIVIDAD } from '../../compartido/compartido.providers';
import { ActualizarUsuarioActual } from '../../usuarios/aplicacion/casos-uso/actualizar-usuario-actual.caso-uso';
import { CerrarSesion } from '../../usuarios/aplicacion/casos-uso/cerrar-sesion.caso-uso';
import { GestorSesion } from '../../usuarios/aplicacion/gestor-sesion';
import { primerNombre, Usuario } from '../../usuarios/dominio/sesion';

/**
 * Inicio del Cliente (PLAN 1.6): saludo, nombre y cerrar sesión. Será la entrada al
 * catálogo en F2 y F4. Funciona sin conexión con la sesión guardada (D-10) y, al
 * recuperar la conexión, refresca los datos y renueva la sesión si hace falta.
 */
@Component({
  selector: 'app-inicio-cliente',
  imports: [IonContent, Card, ButtonDirective, ConfirmDialog, Message, Tag],
  providers: [ConfirmationService],
  templateUrl: './inicio-cliente.page.html',
  styleUrl: './inicio-cliente.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InicioClientePage implements OnInit {
  private readonly gestor = inject(GestorSesion);
  private readonly actualizarUsuario = inject(ActualizarUsuarioActual);
  private readonly cerrarSesion = inject(CerrarSesion);
  private readonly conectividad = inject(CONECTIVIDAD);
  private readonly confirmacion = inject(ConfirmationService);
  private readonly mensajes = inject(MessageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly usuario = signal<Usuario | null>(this.gestor.actual()?.usuario ?? null);
  protected readonly enLinea = signal(true);
  protected readonly cerrando = signal(false);
  protected readonly saludo = computed(() => {
    const usuario = this.usuario();
    return usuario ? `¡Hola, ${primerNombre(usuario)}!` : '¡Hola!';
  });

  ngOnInit(): void {
    const dejarDeOirSesion = this.gestor.suscribir((sesion) =>
      this.usuario.set(sesion?.usuario ?? null),
    );
    this.destroyRef.onDestroy(dejarDeOirSesion);

    void this.conectividad.alCambiar((conectado) => {
      this.enLinea.set(conectado);
      if (conectado) void this.refrescar();
    }).then((dejarDeOir) => this.destroyRef.onDestroy(dejarDeOir));

    void this.iniciar();
  }

  private async iniciar(): Promise<void> {
    this.enLinea.set(await this.conectividad.estaConectado());
    await this.refrescar();
  }

  /** Refresca los datos del Cliente; si la sesión terminó, el interceptor lleva al ingreso. */
  private async refrescar(): Promise<void> {
    try {
      await this.actualizarUsuario.ejecutar();
    } catch {
      // Error temporal o sesión terminada (ya gestionada por el interceptor): se
      // conservan los datos guardados.
    }
  }

  protected confirmarCierre(): void {
    this.confirmacion.confirm({
      header: '¿Cerrar sesión?',
      message: this.enLinea()
        ? 'Tendrás que ingresar de nuevo con tu correo y tu clave.'
        : 'No tienes conexión: para volver a ingresar necesitarás conexión a internet.',
      icon: 'pi pi-sign-out',
      acceptLabel: 'Cerrar sesión',
      rejectLabel: 'Cancelar',
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => void this.salir(),
    });
  }

  private async salir(): Promise<void> {
    this.cerrando.set(true);
    try {
      await this.cerrarSesion.ejecutar();
      this.mensajes.add({
        severity: 'info',
        summary: 'Sesión cerrada',
        detail: 'Vuelve pronto.',
        life: 3000,
      });
      await this.router.navigateByUrl('/bienvenida', { replaceUrl: true });
    } finally {
      this.cerrando.set(false);
    }
  }
}
