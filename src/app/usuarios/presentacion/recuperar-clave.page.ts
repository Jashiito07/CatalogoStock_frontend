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
import { ButtonDirective } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputGroup } from 'primeng/inputgroup';
import { InputPassword } from 'primeng/inputpassword';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';

import { CONECTIVIDAD } from '../../compartido/compartido.providers';
import { CODIGOS_ERROR, ErrorApi } from '../../compartido/dominio/error-api';
import { LogoComponent } from '../../compartido/presentacion/logo/logo.component';
import { RecuperarClave } from '../aplicacion/casos-uso/recuperar-clave.caso-uso';
import { ErrorDatosFormulario } from '../dominio/errores';
import { mensajeDeError, MENSAJES_ERROR } from '../dominio/mensajes-error';
import {
  CampoRecuperacion,
  esClaveValida,
  esCodigoRecuperacionValido,
  esCorreoValido,
  MENSAJES_VALIDACION,
} from '../dominio/validaciones-usuario';
import { MOTIVO_CLAVE_RESTABLECIDA } from './ingreso.page';
import {
  igualA,
  marcarErrorServidor,
  mensajeDeControl,
  reglaDominio,
} from './validadores-formulario';

/**
 * Recuperar clave (RF-USU-05, D-35, D-39; contrato recuperacion-clave.md, «App móvil»).
 * El Cliente escribe el código de 6 dígitos que le dio su vendedor y una clave nueva.
 * Requiere conexión: sin ella el botón queda deshabilitado y se explica por qué.
 */
@Component({
  selector: 'app-recuperar-clave',
  imports: [
    IonContent,
    LogoComponent,
    ReactiveFormsModule,
    RouterLink,
    Card,
    ButtonDirective,
    InputText,
    InputPassword,
    InputGroup,
    Message,
  ],
  templateUrl: './recuperar-clave.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecuperarClavePage implements OnInit {
  private readonly recuperarClave = inject(RecuperarClave);
  private readonly conectividad = inject(CONECTIVIDAD);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly textoSinConexion = MENSAJES_ERROR.claveSinConexion;

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    correo: ['', [reglaDominio(esCorreoValido, MENSAJES_VALIDACION.correo)]],
    codigo: [
      '',
      [reglaDominio(esCodigoRecuperacionValido, MENSAJES_VALIDACION.codigoRecuperacion)],
    ],
    claveNueva: ['', [reglaDominio(esClaveValida, MENSAJES_VALIDACION.clave)]],
    confirmacionClave: ['', [igualA('claveNueva', MENSAJES_VALIDACION.confirmacionClave)]],
  });

  protected readonly enLinea = signal(true);
  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly claveOculta = signal(true);
  protected readonly errorGeneral = signal<string | null>(null);

  constructor() {
    // La confirmación se vuelve a comprobar cuando cambia la clave nueva.
    this.formulario.controls.claveNueva.valueChanges.pipe(takeUntilDestroyed()).subscribe(() =>
      this.formulario.controls.confirmacionClave.updateValueAndValidity({ emitEvent: false }),
    );
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

  protected errorDe(campo: CampoRecuperacion): string | null {
    const control = this.formulario.controls[campo];
    return control.touched || this.enviado() ? mensajeDeControl(control) : null;
  }

  protected async recuperar(): Promise<void> {
    if (this.enviando() || !this.enLinea()) return;
    this.enviado.set(true);
    this.errorGeneral.set(null);
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;

    this.enviando.set(true);
    try {
      await this.recuperarClave.ejecutar(this.formulario.getRawValue());
      await this.router.navigate(['/ingreso'], {
        queryParams: { motivo: MOTIVO_CLAVE_RESTABLECIDA },
        replaceUrl: true,
      });
    } catch (error) {
      this.mostrarError(error);
    } finally {
      this.enviando.set(false);
      this.cdr.markForCheck();
    }
  }

  private mostrarError(error: unknown): void {
    if (error instanceof ErrorDatosFormulario) {
      for (const [campo, mensaje] of Object.entries(error.errores)) {
        marcarErrorServidor(this.formulario, campo, mensaje);
      }
      return;
    }
    if (error instanceof ErrorApi && error.codigo === CODIGOS_ERROR.datosInvalidos) {
      for (const { campo, errores } of error.erroresDeCampo) {
        if (errores[0]) marcarErrorServidor(this.formulario, campo, errores[0]);
      }
    }
    // 422 CODIGO_INVALIDO usa un único mensaje que no revela el motivo (RF-USU-05).
    this.errorGeneral.set(mensajeDeError(error, 'clave'));
  }
}
