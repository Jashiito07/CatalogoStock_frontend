import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonFooter } from '@ionic/angular';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Avatar } from 'primeng/avatar';
import { ButtonDirective } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Message } from 'primeng/message';
import { SelectButton } from 'primeng/selectbutton';

import { CONECTIVIDAD } from '../../compartido/compartido.providers';
import { PreferenciaTema } from '../../compartido/dominio/tema';
import { BarraPestanasComponent } from '../../compartido/presentacion/barra-pestanas/barra-pestanas.component';
import { EtiquetaEstadoComponent } from '../../compartido/presentacion/etiqueta-estado/etiqueta-estado.component';
import { ServicioTema } from '../../compartido/presentacion/tema/servicio-tema';
import { ActualizarUsuarioActual } from '../aplicacion/casos-uso/actualizar-usuario-actual.caso-uso';
import { CerrarSesion } from '../aplicacion/casos-uso/cerrar-sesion.caso-uso';
import { GestorSesion } from '../aplicacion/gestor-sesion';
import { correoVerificado, Usuario } from '../dominio/sesion';
import { VerificarCorreoComponent } from './verificar-correo.component';

interface OpcionTema {
  readonly etiqueta: string;
  readonly valor: PreferenciaTema;
  readonly icono: string;
}

/** Iniciales del nombre para el avatar: «María Zambrano» → «MZ». */
function inicialesDe(nombre: string): string {
  const palabras = nombre.split(/\s+/).filter((p) => p.length > 0);
  const letras = palabras.length >= 2 ? [palabras[0], palabras[palabras.length - 1]] : [palabras[0]];
  return letras.map((p) => (p ?? '').charAt(0)).join('').toUpperCase() || '?';
}

/**
 * Cuenta del Cliente (RF-USU-05, N2): perfil, aviso «Verifica tu correo», selector de tema,
 * datos, «Cambiar mi clave» y cerrar sesión. Funciona sin conexión con la sesión guardada
 * (D-10) y, al recuperar la conexión, refresca los datos y renueva la sesión si hace falta.
 * La app no ofrece eliminar la cuenta: esa función no está definida en el DERCA.
 */
@Component({
  selector: 'app-cuenta',
  imports: [
    IonContent,
    IonFooter,
    RouterLink,
    FormsModule,
    Avatar,
    ButtonDirective,
    ConfirmDialog,
    Message,
    SelectButton,
    BarraPestanasComponent,
    EtiquetaEstadoComponent,
    VerificarCorreoComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './cuenta.page.html',
  styleUrl: './cuenta.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentaPage implements OnInit {
  private readonly gestor = inject(GestorSesion);
  private readonly actualizarUsuario = inject(ActualizarUsuarioActual);
  private readonly cerrarSesion = inject(CerrarSesion);
  private readonly conectividad = inject(CONECTIVIDAD);
  private readonly confirmacion = inject(ConfirmationService);
  private readonly mensajes = inject(MessageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly tema = inject(ServicioTema);

  /** Tema: Automático (18:40 a 06:45 oscuro) / Claro / Oscuro (N2). */
  protected readonly opcionesTema: OpcionTema[] = [
    { etiqueta: 'Automático', valor: 'automatico', icono: 'pi pi-desktop' },
    { etiqueta: 'Claro', valor: 'claro', icono: 'pi pi-sun' },
    { etiqueta: 'Oscuro', valor: 'oscuro', icono: 'pi pi-moon' },
  ];
  protected readonly preferenciaTema = this.tema.preferencia;

  protected readonly usuario = signal<Usuario | null>(this.gestor.actual()?.usuario ?? null);
  protected readonly enLinea = signal(true);
  protected readonly cerrando = signal(false);
  /** RF-USU-05: se avisa mientras `correoVerificadoEn` sea nulo (no bloquea el acceso). */
  protected readonly sinVerificar = computed(() => {
    const usuario = this.usuario();
    return usuario !== null && !correoVerificado(usuario);
  });
  protected readonly iniciales = computed(() => {
    const usuario = this.usuario();
    return usuario ? inicialesDe(usuario.nombre) : '?';
  });

  ngOnInit(): void {
    const dejarDeOirSesion = this.gestor.suscribir((sesion) =>
      this.usuario.set(sesion?.usuario ?? null),
    );
    this.destroyRef.onDestroy(dejarDeOirSesion);

    void this.conectividad
      .alCambiar((conectado) => {
        this.enLinea.set(conectado);
        if (conectado) void this.refrescar();
      })
      .then((dejarDeOir) => this.destroyRef.onDestroy(dejarDeOir));

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

  protected elegirTema(preferencia: PreferenciaTema | null): void {
    // El selector no permite dejar el valor vacío (allowEmpty = false), pero se protege.
    if (preferencia) void this.tema.seleccionar(preferencia);
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
