import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
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
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputGroup } from 'primeng/inputgroup';
import { InputPassword } from 'primeng/inputpassword';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';

import { CODIGOS_ERROR, ErrorApi } from '../../compartido/dominio/error-api';
import {
  ConsultarAvisoPrivacidad,
  ResultadoAviso,
} from '../aplicacion/casos-uso/consultar-aviso-privacidad.caso-uso';
import { RegistrarCliente } from '../aplicacion/casos-uso/registrar-cliente.caso-uso';
import { ErrorDatosFormulario } from '../dominio/errores';
import { mensajeDeError, MENSAJES_ERROR } from '../dominio/mensajes-error';
import { primerNombre } from '../dominio/sesion';
import { interpretarTextoAviso } from '../dominio/texto-aviso';
import {
  esClaveValida,
  esCorreoValido,
  esNombreValido,
  esTelefonoValido,
  MENSAJES_VALIDACION,
} from '../dominio/validaciones-usuario';
import { MOTIVO_CUENTA_CREADA } from './ingreso.page';
import {
  casillaMarcada,
  igualA,
  marcarErrorServidor,
  mensajeDeControl,
  reglaDominio,
} from './validadores-formulario';

type CampoRegistro =
  | 'nombre'
  | 'correo'
  | 'telefono'
  | 'clave'
  | 'confirmacionClave'
  | 'aceptaPrivacidad';

type EstadoAviso =
  | { readonly tipo: 'cargando' }
  | { readonly tipo: 'listo'; readonly resultado: ResultadoAviso }
  | { readonly tipo: 'error'; readonly mensaje: string };

/**
 * Registro del Cliente (RF-USU-01, RNF-16, D-11, D-14, D-22): nombre, correo, teléfono,
 * clave, confirmación y aceptación del aviso de privacidad, que se lee en un `p-dialog`.
 * Valida igual que la API y, al terminar, ingresa con las mismas credenciales.
 */
@Component({
  selector: 'app-registro',
  imports: [
    IonContent,
    ReactiveFormsModule,
    RouterLink,
    Card,
    ButtonDirective,
    InputText,
    InputPassword,
    InputGroup,
    Checkbox,
    Dialog,
    Message,
    ProgressSpinner,
  ],
  templateUrl: './registro.page.html',
  styleUrl: './registro.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroPage implements OnInit {
  private readonly registrarCliente = inject(RegistrarCliente);
  private readonly consultarAviso = inject(ConsultarAvisoPrivacidad);
  private readonly router = inject(Router);
  private readonly mensajes = inject(MessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    nombre: ['', [reglaDominio(esNombreValido, MENSAJES_VALIDACION.nombre)]],
    correo: ['', [reglaDominio(esCorreoValido, MENSAJES_VALIDACION.correo)]],
    telefono: ['', [reglaDominio(esTelefonoValido, MENSAJES_VALIDACION.telefono)]],
    clave: ['', [reglaDominio(esClaveValida, MENSAJES_VALIDACION.clave)]],
    confirmacionClave: ['', [igualA('clave', MENSAJES_VALIDACION.confirmacionClave)]],
    aceptaPrivacidad: [false, [casillaMarcada(MENSAJES_VALIDACION.aceptaPrivacidad)]],
  });

  protected readonly estadoAviso = signal<EstadoAviso>({ tipo: 'cargando' });
  protected readonly dialogoAvisoVisible = signal(false);
  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly claveOculta = signal(true);
  protected readonly errorGeneral = signal<string | null>(null);

  protected readonly bloquesAviso = computed(() => {
    const estado = this.estadoAviso();
    return estado.tipo === 'listo' ? interpretarTextoAviso(estado.resultado.aviso.contenido) : [];
  });

  constructor() {
    // Al cambiar la clave, la confirmación se vuelve a comparar.
    this.formulario.controls.clave.valueChanges.pipe(takeUntilDestroyed()).subscribe(() =>
      this.formulario.controls.confirmacionClave.updateValueAndValidity({ emitEvent: false }),
    );
  }

  ngOnInit(): void {
    void this.cargarAviso();
  }

  protected errorDe(campo: CampoRegistro): string | null {
    const control = this.formulario.controls[campo];
    return control.touched || this.enviado() ? mensajeDeControl(control) : null;
  }

  protected async cargarAviso(): Promise<void> {
    this.estadoAviso.set({ tipo: 'cargando' });
    try {
      this.estadoAviso.set({ tipo: 'listo', resultado: await this.consultarAviso.ejecutar() });
    } catch (error) {
      this.estadoAviso.set({ tipo: 'error', mensaje: mensajeDeError(error, 'aviso') });
    }
  }

  protected abrirAviso(): void {
    this.dialogoAvisoVisible.set(true);
  }

  /** Aceptar desde el diálogo marca la casilla (el Cliente leyó el aviso). */
  protected aceptarAviso(): void {
    this.formulario.controls.aceptaPrivacidad.setValue(true);
    this.formulario.controls.aceptaPrivacidad.markAsTouched();
    this.dialogoAvisoVisible.set(false);
  }

  protected async registrar(): Promise<void> {
    if (this.enviando()) return;
    this.enviado.set(true);
    this.errorGeneral.set(null);
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;

    const estado = this.estadoAviso();
    if (estado.tipo !== 'listo') {
      this.errorGeneral.set(MENSAJES_ERROR.avisoSinConexion);
      return;
    }

    this.enviando.set(true);
    try {
      const resultado = await this.registrarCliente.ejecutar(
        this.formulario.getRawValue(),
        estado.resultado.aviso.version,
      );
      if (resultado.tipo === 'sesion-iniciada') {
        this.mensajes.add({
          severity: 'success',
          summary: '¡Cuenta creada!',
          detail: `Hola, ${primerNombre(resultado.sesion.usuario)}. Ya iniciaste sesión.`,
          life: 3000,
        });
        await this.router.navigateByUrl('/inicio', { replaceUrl: true });
      } else {
        await this.router.navigate(['/ingreso'], {
          queryParams: { motivo: MOTIVO_CUENTA_CREADA },
          replaceUrl: true,
        });
      }
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
      this.errorGeneral.set(MENSAJES_ERROR.datosInvalidos);
      return;
    }
    if (error instanceof ErrorApi) {
      switch (error.codigo) {
        case CODIGOS_ERROR.datosInvalidos:
          for (const { campo, errores } of error.erroresDeCampo) {
            if (errores[0]) marcarErrorServidor(this.formulario, campo, errores[0]);
          }
          break;
        case CODIGOS_ERROR.correoYaRegistrado:
          marcarErrorServidor(this.formulario, 'correo', MENSAJES_ERROR.correoYaRegistrado);
          break;
        case CODIGOS_ERROR.privacidadNoAceptada:
          this.formulario.controls.aceptaPrivacidad.setValue(false);
          break;
        case CODIGOS_ERROR.privacidadDesactualizada:
          // Hay una versión nueva del aviso: se vuelve a cargar y se pide aceptarla.
          this.formulario.controls.aceptaPrivacidad.setValue(false);
          await this.cargarAviso();
          break;
      }
    }
    this.errorGeneral.set(mensajeDeError(error, 'registro'));
  }
}
