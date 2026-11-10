import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { MessageService } from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputGroup } from 'primeng/inputgroup';
import { InputPassword } from 'primeng/inputpassword';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';

import { URL_PANEL } from '../../compartido/compartido.providers';
import { ErrorApi } from '../../compartido/dominio/error-api';
import { LogoComponent } from '../../compartido/presentacion/logo/logo.component';
import { IniciarSesion } from '../aplicacion/casos-uso/iniciar-sesion.caso-uso';
import { ErrorDatosFormulario } from '../dominio/errores';
import { mensajeDeError, MENSAJES_ERROR } from '../dominio/mensajes-error';
import { primerNombre } from '../dominio/sesion';
import { esCorreoValido, MENSAJES_VALIDACION } from '../dominio/validaciones-usuario';
import { MOTIVO_SESION_EXPIRADA } from '../infraestructura/interceptor-autenticacion';
import { marcarErrorServidor, mensajeDeControl, reglaDominio } from './validadores-formulario';

/** Motivo con el que el registro envía aquí si la cuenta se creó pero no se pudo ingresar. */
export const MOTIVO_CUENTA_CREADA = 'cuenta-creada';

/** Motivo con el que «Recuperar clave» envía aquí tras cambiar la clave (RF-USU-05). */
export const MOTIVO_CLAVE_RESTABLECIDA = 'clave-restablecida';

export const TEXTO_CLAVE_RESTABLECIDA = 'Tu clave se cambió. Inicia sesión con tu nueva clave.';

type CampoIngreso = 'correo' | 'clave';

interface AvisoIngreso {
  readonly severidad: 'warn' | 'success';
  readonly texto: string;
}

/**
 * Ingreso del Cliente (RF-USU-01, CA-01). Usa solo `/autenticacion/ingreso/cliente`
 * (D-19), enlaza con «Recuperar clave» (RF-USU-05) y muestra siempre el botón que abre
 * el panel web del Vendedor en el navegador del dispositivo (D-01, D-37).
 */
@Component({
  selector: 'app-ingreso',
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
  templateUrl: './ingreso.page.html',
  styleUrl: './ingreso.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngresoPage {
  /** Panel web del Vendedor (D-37). */
  protected readonly urlPanel = inject(URL_PANEL);
  private readonly iniciarSesion = inject(IniciarSesion);
  private readonly router = inject(Router);
  private readonly mensajes = inject(MessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    correo: [
      '',
      [
        reglaDominio((v) => v.trim().length > 0, MENSAJES_VALIDACION.correoIngreso),
        reglaDominio((v) => v.trim().length === 0 || esCorreoValido(v), MENSAJES_VALIDACION.correo),
      ],
    ],
    clave: ['', [reglaDominio((v) => v.length > 0, MENSAJES_VALIDACION.claveIngreso)]],
  });

  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly claveOculta = signal(true);
  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly aviso = signal<AvisoIngreso | null>(this.avisoInicial());

  protected errorDe(campo: CampoIngreso): string | null {
    const control = this.formulario.controls[campo];
    return control.touched || this.enviado() ? mensajeDeControl(control) : null;
  }

  protected async ingresar(): Promise<void> {
    if (this.enviando()) return;
    this.enviado.set(true);
    this.errorGeneral.set(null);
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;

    this.enviando.set(true);
    try {
      const sesion = await this.iniciarSesion.ejecutar(this.formulario.getRawValue());
      this.mensajes.add({
        severity: 'success',
        summary: `¡Hola, ${primerNombre(sesion.usuario)}!`,
        detail: 'Iniciaste sesión.',
        life: 3000,
      });
      await this.router.navigateByUrl('/inicio', { replaceUrl: true });
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
    if (error instanceof ErrorApi && error.codigo === 'DATOS_INVALIDOS') {
      for (const { campo, errores } of error.erroresDeCampo) {
        if (errores[0]) marcarErrorServidor(this.formulario, campo, errores[0]);
      }
    }
    this.errorGeneral.set(mensajeDeError(error, 'ingreso'));
  }

  private avisoInicial(): AvisoIngreso | null {
    const motivo = inject(ActivatedRoute).snapshot.queryParamMap.get('motivo');
    if (motivo === MOTIVO_SESION_EXPIRADA) {
      return { severidad: 'warn', texto: MENSAJES_ERROR.sesionExpirada };
    }
    if (motivo === MOTIVO_CUENTA_CREADA) {
      return { severidad: 'success', texto: 'Tu cuenta se creó. Inicia sesión para continuar.' };
    }
    if (motivo === MOTIVO_CLAVE_RESTABLECIDA) {
      return { severidad: 'success', texto: TEXTO_CLAVE_RESTABLECIDA };
    }
    return null;
  }
}
