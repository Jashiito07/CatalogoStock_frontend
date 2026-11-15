import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';

import { CODIGOS_ERROR, ErrorApi } from '../../compartido/dominio/error-api';
import { ConfirmarVerificacionCorreo } from '../aplicacion/casos-uso/confirmar-verificacion-correo.caso-uso';
import { SolicitarVerificacionCorreo } from '../aplicacion/casos-uso/solicitar-verificacion-correo.caso-uso';
import { ErrorDatosFormulario } from '../dominio/errores';
import {
  mensajeCodigoIncorrecto,
  mensajeDeError,
  MENSAJES_ERROR,
} from '../dominio/mensajes-error';
import { esCodigoRecuperacionValido, MENSAJES_VALIDACION } from '../dominio/validaciones-usuario';
import { CuentaRegresiva, ESPERA_REENVIO_SEGUNDOS, formatearEspera } from './cuenta-regresiva';

/**
 * Aviso «Verifica tu correo» (RF-USU-05, D-50; contrato correo.md). Se muestra en el
 * inicio mientras `correoVerificadoEn` sea `null`:
 *
 * 1. «Enviar código» → `POST /usuarios/yo/correo/verificacion` (solo al correo registrado).
 * 2. El Cliente escribe los 6 dígitos y pulsa «Confirmar».
 * 3. Al confirmar, el padre deja de mostrarlo porque el usuario ya está verificado.
 *
 * Sin conexión no bloquea nada: explica que hace falta conexión y el resto de la app
 * sigue funcionando (RNF-06).
 */
@Component({
  selector: 'app-verificar-correo',
  imports: [ReactiveFormsModule, Card, ButtonDirective, InputText, Message],
  templateUrl: './verificar-correo.component.html',
  styleUrl: './verificar-correo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificarCorreoComponent {
  /** Correo registrado de la cuenta: a esa dirección se envía el código. */
  readonly correo = input.required<string>();
  readonly enLinea = input(true);

  private readonly solicitar = inject(SolicitarVerificacionCorreo);
  private readonly confirmar = inject(ConfirmarVerificacionCorreo);
  private readonly mensajes = inject(MessageService);

  protected readonly codigo = new FormControl('', { nonNullable: true });
  protected readonly enviando = signal(false);
  protected readonly confirmando = signal(false);
  protected readonly codigoEnviado = signal(false);
  protected readonly intentosFallidos = signal(0);
  protected readonly errorEnvio = signal<string | null>(null);
  protected readonly errorCodigo = signal<string | null>(null);
  protected readonly espera = new CuentaRegresiva(inject(DestroyRef));
  protected readonly formatearEspera = formatearEspera;
  protected readonly textoSinConexion = MENSAJES_ERROR.verificacionSinConexion;

  constructor() {
    // Solo dígitos, máximo 6 (también cuando el teclado sugiere el código recibido).
    this.codigo.valueChanges.pipe(takeUntilDestroyed()).subscribe((valor) => {
      const limpio = valor.replace(/\D/gu, '').slice(0, 6);
      if (limpio !== valor) this.codigo.setValue(limpio, { emitEvent: false });
      this.errorCodigo.set(null);
    });
  }

  protected async enviarCodigo(): Promise<void> {
    if (this.enviando() || this.espera.segundos() > 0 || !this.enLinea()) return;
    this.enviando.set(true);
    this.errorEnvio.set(null);
    try {
      await this.solicitar.ejecutar();
      this.codigoEnviado.set(true);
      this.intentosFallidos.set(0);
      this.codigo.reset('');
      this.espera.iniciar(ESPERA_REENVIO_SEGUNDOS);
      this.mensajes.add({
        severity: 'success',
        summary: 'Código enviado',
        detail: 'Revisa tu correo e ingresa los 6 dígitos.',
        life: 4000,
      });
    } catch (error) {
      this.errorEnvio.set(mensajeDeError(error, 'verificacion'));
      if (error instanceof ErrorApi && error.codigo === CODIGOS_ERROR.demasiadasSolicitudes) {
        this.espera.iniciar(error.reintentarEnSegundos ?? ESPERA_REENVIO_SEGUNDOS);
      }
    } finally {
      this.enviando.set(false);
    }
  }

  protected async confirmarCodigo(): Promise<void> {
    if (this.confirmando() || !this.enLinea()) return;
    this.errorCodigo.set(null);
    if (!esCodigoRecuperacionValido(this.codigo.value)) {
      this.errorCodigo.set(MENSAJES_VALIDACION.codigoRecuperacion);
      return;
    }
    this.confirmando.set(true);
    try {
      await this.confirmar.ejecutar(this.codigo.value);
      this.mensajes.add({
        severity: 'success',
        summary: 'Correo verificado',
        detail: 'Ahora puedes recuperar tu clave desde tu correo.',
        life: 4000,
      });
    } catch (error) {
      this.mostrarErrorConfirmacion(error);
    } finally {
      this.confirmando.set(false);
    }
  }

  private mostrarErrorConfirmacion(error: unknown): void {
    if (error instanceof ErrorDatosFormulario) {
      this.errorCodigo.set(error.errores['codigo'] ?? MENSAJES_VALIDACION.codigoRecuperacion);
      return;
    }
    if (error instanceof ErrorApi && error.codigo === CODIGOS_ERROR.codigoInvalido) {
      this.intentosFallidos.update((n) => n + 1);
      this.errorCodigo.set(mensajeCodigoIncorrecto(this.intentosFallidos()));
      return;
    }
    this.errorCodigo.set(mensajeDeError(error, 'verificacion'));
  }
}
