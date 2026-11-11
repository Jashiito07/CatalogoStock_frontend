import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { MessageService } from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputGroup } from 'primeng/inputgroup';
import { InputPassword } from 'primeng/inputpassword';
import { Message } from 'primeng/message';

import { CONECTIVIDAD } from '../../compartido/compartido.providers';
import { CODIGOS_ERROR, ErrorApi } from '../../compartido/dominio/error-api';
import { LogoComponent } from '../../compartido/presentacion/logo/logo.component';
import { CambiarClave } from '../aplicacion/casos-uso/cambiar-clave.caso-uso';
import { ErrorDatosFormulario, ErrorSesionExpirada } from '../dominio/errores';
import { mensajeDeError, MENSAJES_ERROR } from '../dominio/mensajes-error';
import {
  CampoCambioClave,
  esClaveValida,
  MENSAJES_VALIDACION,
} from '../dominio/validaciones-usuario';
import { MOTIVO_SESION_EXPIRADA } from '../infraestructura/interceptor-autenticacion';
import {
  igualA,
  marcarErrorServidor,
  mensajeDeControl,
  reglaDominio,
} from './validadores-formulario';

/**
 * Cambiar mi clave con la sesión iniciada (RF-USU-05; contrato recuperacion-clave.md,
 * `POST /usuarios/yo/clave`). Conserva esta sesión y el servidor cierra las demás.
 * Requiere conexión: sin ella el botón queda deshabilitado y se explica por qué.
 */
@Component({
  selector: 'app-cambiar-clave',
  imports: [
    IonContent,
    LogoComponent,
    ReactiveFormsModule,
    RouterLink,
    Card,
    ButtonDirective,
    InputPassword,
    InputGroup,
    Message,
  ],
  templateUrl: './cambiar-clave.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CambiarClavePage implements OnInit {
  private readonly cambiarClave = inject(CambiarClave);
  private readonly conectividad = inject(CONECTIVIDAD);
  private readonly mensajes = inject(MessageService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly textoSinConexion = MENSAJES_ERROR.claveSinConexion;

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    claveActual: ['', [reglaDominio((v) => v.length > 0, MENSAJES_VALIDACION.claveActual)]],
    claveNueva: [
      '',
      [
        reglaDominio(esClaveValida, MENSAJES_VALIDACION.clave),
        // La clave nueva debe ser distinta de la actual (400 del contrato).
        (control) =>
          control.value !== '' && control.value === control.parent?.get('claveActual')?.value
            ? { regla: MENSAJES_VALIDACION.claveNuevaIgual }
            : null,
      ],
    ],
    confirmacionClave: ['', [igualA('claveNueva', MENSAJES_VALIDACION.confirmacionClave)]],
  });

  protected readonly enLinea = signal(true);
  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly claveOculta = signal(true);
  protected readonly errorGeneral = signal<string | null>(null);

  constructor() {
    const { claveActual, claveNueva, confirmacionClave } = this.formulario.controls;
    claveActual.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => claveNueva.updateValueAndValidity({ emitEvent: false }));
    claveNueva.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => confirmacionClave.updateValueAndValidity({ emitEvent: false }));
  }

  ngOnInit(): void {
    void this.conectividad
      .alCambiar((conectado) => {
        this.enLinea.set(conectado);
        this.cdr.markForCheck();
      })
      .then((dejarDeOir) => this.destroyRef.onDestroy(dejarDeOir));
    void this.conectividad.estaConectado().then((conectado) => {
      this.enLinea.set(conectado);
      this.cdr.markForCheck();
    });
  }

  protected errorDe(campo: CampoCambioClave): string | null {
    const control = this.formulario.controls[campo];
    return control.touched || this.enviado() ? mensajeDeControl(control) : null;
  }

  protected async cambiar(): Promise<void> {
    if (this.enviando() || !this.enLinea()) return;
    this.enviado.set(true);
    this.errorGeneral.set(null);
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;

    this.enviando.set(true);
    try {
      await this.cambiarClave.ejecutar(this.formulario.getRawValue());
      this.mensajes.add({
        severity: 'success',
        summary: 'Clave cambiada',
        detail: 'Tu clave se cambió. Cerramos tu sesión en los demás dispositivos.',
        life: 4000,
      });
      await this.router.navigateByUrl('/inicio', { replaceUrl: true });
    } catch (error) {
      await this.mostrarError(error);
    } finally {
      this.enviando.set(false);
      this.cdr.markForCheck();
    }
  }

  private async mostrarError(error: unknown): Promise<void> {
    if (error instanceof ErrorDatosFormulario) {
      for (const [campo, mensaje] of Object.entries(error.errores)) {
        marcarErrorServidor(this.formulario, campo, mensaje);
      }
      return;
    }
    if (error instanceof ErrorSesionExpirada) {
      await this.router.navigate(['/ingreso'], {
        queryParams: { motivo: MOTIVO_SESION_EXPIRADA },
        replaceUrl: true,
      });
      return;
    }
    if (error instanceof ErrorApi) {
      if (error.codigo === CODIGOS_ERROR.claveActualIncorrecta) {
        marcarErrorServidor(this.formulario, 'claveActual', MENSAJES_ERROR.claveActualIncorrecta);
        return;
      }
      if (error.codigo === CODIGOS_ERROR.datosInvalidos) {
        // La API marca el campo (p. ej. `claveNueva`: «La clave nueva debe ser distinta de
        // la actual.»): el error se muestra bajo ese campo.
        let marcados = 0;
        for (const { campo, errores } of error.erroresDeCampo) {
          if (errores[0] && marcarErrorServidor(this.formulario, campo, errores[0])) marcados++;
        }
        if (marcados === 0 && error.message === MENSAJES_VALIDACION.claveNuevaIgual) {
          marcados += Number(
            marcarErrorServidor(this.formulario, 'claveNueva', MENSAJES_VALIDACION.claveNuevaIgual),
          );
        }
        if (marcados > 0) return;
      }
    }
    this.errorGeneral.set(mensajeDeError(error, 'clave'));
  }
}
