import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputGroup } from 'primeng/inputgroup';
import { InputPassword } from 'primeng/inputpassword';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';

import { CODIGOS_ERROR, ErrorApi } from '../../compartido/dominio/error-api';
import { RecuperarClave } from '../aplicacion/casos-uso/recuperar-clave.caso-uso';
import { SolicitarCodigoRecuperacion } from '../aplicacion/casos-uso/solicitar-codigo-recuperacion.caso-uso';
import { ErrorDatosFormulario } from '../dominio/errores';
import {
  mensajeCodigoIncorrecto,
  mensajeDeError,
  MENSAJES_ERROR,
} from '../dominio/mensajes-error';
import {
  CampoRecuperacion,
  esClaveValida,
  esCodigoRecuperacionValido,
  esCorreoValido,
  MENSAJES_VALIDACION,
} from '../dominio/validaciones-usuario';
import { MOTIVO_CLAVE_RESTABLECIDA } from './ingreso.page';
import { CuentaRegresiva, ESPERA_REENVIO_SEGUNDOS, formatearEspera } from './cuenta-regresiva';
import {
  igualA,
  marcarErrorServidor,
  mensajeDeControl,
  reglaDominio,
} from './validadores-formulario';

/**
 * Recuperar la clave con un código enviado al correo (RF-USU-05, D-35, D-50; contrato
 * correo.md).
 *
 * Paso 1: el Cliente escribe el correo de su cuenta y la app siempre muestra el mismo
 * mensaje neutro, exista o no la cuenta (la API responde 204 en ambos casos).
 * Paso 2: escribe el código, la clave nueva y su repetición. Al terminar, la sesión local
 * se borra (el servidor revocó todas) y vuelve al ingreso con un aviso.
 */
@Component({
  selector: 'app-recuperar-por-correo',
  imports: [ReactiveFormsModule, Card, ButtonDirective, InputText, InputPassword, InputGroup, Message],
  templateUrl: './recuperar-por-correo.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecuperarPorCorreoComponent {
  readonly enLinea = input(true);

  private readonly solicitarCodigo = inject(SolicitarCodigoRecuperacion);
  private readonly recuperarClave = inject(RecuperarClave);
  private readonly router = inject(Router);
  private readonly mensajes = inject(MessageService);

  protected readonly correo = new FormControl('', {
    nonNullable: true,
    validators: [reglaDominio(esCorreoValido, MENSAJES_VALIDACION.correo)],
  });
  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    codigo: [
      '',
      [reglaDominio(esCodigoRecuperacionValido, MENSAJES_VALIDACION.codigoRecuperacion)],
    ],
    claveNueva: ['', [reglaDominio(esClaveValida, MENSAJES_VALIDACION.clave)]],
    confirmacionClave: ['', [igualA('claveNueva', MENSAJES_VALIDACION.confirmacionClave)]],
  });

  protected readonly paso = signal<'correo' | 'codigo'>('correo');
  protected readonly solicitando = signal(false);
  protected readonly restableciendo = signal(false);
  protected readonly intentadoSolicitar = signal(false);
  protected readonly intentadoRestablecer = signal(false);
  protected readonly claveOculta = signal(true);
  protected readonly intentosFallidos = signal(0);
  protected readonly errorSolicitud = signal<string | null>(null);
  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly espera = new CuentaRegresiva(inject(DestroyRef));
  protected readonly formatearEspera = formatearEspera;
  protected readonly mensajeNeutro = MENSAJES_ERROR.recuperacionSolicitada;
  protected readonly textoSinConexion = MENSAJES_ERROR.claveSinConexion;

  constructor() {
    this.formulario.controls.claveNueva.valueChanges.pipe(takeUntilDestroyed()).subscribe(() =>
      this.formulario.controls.confirmacionClave.updateValueAndValidity({ emitEvent: false }),
    );
    // Solo dígitos, máximo 6.
    this.formulario.controls.codigo.valueChanges.pipe(takeUntilDestroyed()).subscribe((valor) => {
      const limpio = valor.replace(/\D/gu, '').slice(0, 6);
      if (limpio !== valor) this.formulario.controls.codigo.setValue(limpio, { emitEvent: false });
    });
  }

  protected errorCorreo(): string | null {
    return this.correo.touched || this.intentadoSolicitar() ? mensajeDeControl(this.correo) : null;
  }

  protected errorDe(campo: CampoRecuperacion): string | null {
    if (campo === 'correo') return null;
    const control = this.formulario.controls[campo];
    return control.touched || this.intentadoRestablecer() ? mensajeDeControl(control) : null;
  }

  protected async enviarCodigo(): Promise<void> {
    if (this.solicitando() || !this.enLinea() || this.espera.segundos() > 0) return;
    this.intentadoSolicitar.set(true);
    this.errorSolicitud.set(null);
    this.correo.markAsTouched();
    if (this.correo.invalid) return;

    this.solicitando.set(true);
    try {
      await this.solicitarCodigo.ejecutar(this.correo.value);
      // Misma respuesta exista o no la cuenta (principio 2 de correo.md).
      this.paso.set('codigo');
      this.intentosFallidos.set(0);
      this.espera.iniciar(ESPERA_REENVIO_SEGUNDOS);
    } catch (error) {
      this.errorSolicitud.set(
        error instanceof ErrorDatosFormulario
          ? (error.errores['correo'] ?? MENSAJES_VALIDACION.correo)
          : mensajeDeError(error, 'recuperacionCorreo'),
      );
      if (error instanceof ErrorApi && error.codigo === CODIGOS_ERROR.demasiadasSolicitudes) {
        this.espera.iniciar(error.reintentarEnSegundos ?? ESPERA_REENVIO_SEGUNDOS);
      }
    } finally {
      this.solicitando.set(false);
    }
  }

  protected usarOtroCorreo(): void {
    this.paso.set('correo');
    this.errorGeneral.set(null);
    this.formulario.reset();
    this.intentadoRestablecer.set(false);
  }

  protected async restablecer(): Promise<void> {
    if (this.restableciendo() || !this.enLinea()) return;
    this.intentadoRestablecer.set(true);
    this.errorGeneral.set(null);
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;

    this.restableciendo.set(true);
    try {
      await this.recuperarClave.ejecutar({
        correo: this.correo.value,
        ...this.formulario.getRawValue(),
      });
      this.mensajes.add({
        severity: 'success',
        summary: 'Clave cambiada',
        detail: 'Inicia sesión con tu nueva clave.',
        life: 4000,
      });
      await this.router.navigate(['/ingreso'], {
        queryParams: { motivo: MOTIVO_CLAVE_RESTABLECIDA },
        replaceUrl: true,
      });
    } catch (error) {
      this.mostrarError(error);
    } finally {
      this.restableciendo.set(false);
    }
  }

  private mostrarError(error: unknown): void {
    if (error instanceof ErrorDatosFormulario) {
      for (const [campo, mensaje] of Object.entries(error.errores)) {
        marcarErrorServidor(this.formulario, campo, mensaje);
      }
      return;
    }
    if (error instanceof ErrorApi && error.codigo === CODIGOS_ERROR.codigoInvalido) {
      this.intentosFallidos.update((n) => n + 1);
      this.errorGeneral.set(mensajeCodigoIncorrecto(this.intentosFallidos()));
      return;
    }
    if (error instanceof ErrorApi && error.codigo === CODIGOS_ERROR.datosInvalidos) {
      for (const { campo, errores } of error.erroresDeCampo) {
        if (errores[0]) marcarErrorServidor(this.formulario, campo, errores[0]);
      }
    }
    this.errorGeneral.set(mensajeDeError(error, 'recuperacionCorreo'));
  }
}
