import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';

import { ErrorApi, ErrorSinConexion } from '../../compartido/dominio/error-api';
import { ConfirmarVerificacionCorreo } from '../aplicacion/casos-uso/confirmar-verificacion-correo.caso-uso';
import { SolicitarVerificacionCorreo } from '../aplicacion/casos-uso/solicitar-verificacion-correo.caso-uso';
import { VerificarCorreoComponent } from './verificar-correo.component';

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0));

describe('VerificarCorreoComponent (RF-USU-05, D-50; contrato correo.md)', () => {
  let solicitar: ReturnType<typeof vi.fn>;
  let confirmar: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<VerificarCorreoComponent>;
  let elemento: HTMLElement;

  async function abrir(enLinea = true): Promise<void> {
    fixture = TestBed.createComponent(VerificarCorreoComponent);
    fixture.componentRef.setInput('correo', 'maria.zambrano@correo.com');
    fixture.componentRef.setInput('enLinea', enLinea);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    await esperar();
    fixture.detectChanges();
  }

  async function pulsar(selector: string): Promise<void> {
    elemento.querySelector<HTMLElement>(selector)?.click();
    await esperar();
    fixture.detectChanges();
    await esperar();
    fixture.detectChanges();
  }

  function escribirCodigo(valor: string): void {
    const input = elemento.querySelector<HTMLInputElement>('#verificar-codigo');
    if (!input) throw new Error('No existe el campo del código');
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  async function confirmarFormulario(): Promise<void> {
    elemento.querySelector('form')?.dispatchEvent(new Event('submit'));
    await esperar();
    fixture.detectChanges();
    await esperar();
    fixture.detectChanges();
  }

  beforeEach(() => {
    solicitar = vi.fn(async () => undefined);
    confirmar = vi.fn(async () => undefined);
    TestBed.configureTestingModule({
      providers: [
        MessageService,
        { provide: SolicitarVerificacionCorreo, useValue: { ejecutar: solicitar } },
        { provide: ConfirmarVerificacionCorreo, useValue: { ejecutar: confirmar } },
      ],
    });
  });

  it('muestra «Verifica tu correo», el correo de destino y el botón «Enviar código»', async () => {
    await abrir();

    expect(elemento.querySelector('h2')?.textContent).toContain('Verifica tu correo');
    expect(elemento.textContent).toContain('maria.zambrano@correo.com');
    expect(elemento.querySelector('#verificar-enviar')?.textContent).toContain('Enviar código');
    expect(elemento.querySelector('#verificar-codigo')).toBeNull();
  });

  it('204: avisa con toast, muestra el campo del código y arranca la cuenta regresiva', async () => {
    await abrir();
    const aviso = vi.spyOn(TestBed.inject(MessageService), 'add');

    await pulsar('#verificar-enviar');

    expect(solicitar).toHaveBeenCalledTimes(1);
    expect(aviso).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    const campo = elemento.querySelector<HTMLInputElement>('#verificar-codigo');
    expect(campo?.getAttribute('autocomplete')).toBe('one-time-code');
    expect(campo?.getAttribute('inputmode')).toBe('numeric');
    expect(elemento.querySelector('#verificar-espera')?.textContent).toContain('1:00');
    const reenviar = elemento.querySelector<HTMLButtonElement>('#verificar-enviar');
    expect(reenviar?.disabled).toBe(true);
    expect(reenviar?.textContent).toContain('Reenviar código');
  });

  it('503: «No pudimos enviar el correo, intenta de nuevo.» y permite reintentar', async () => {
    solicitar.mockRejectedValue(new ErrorApi(503, 'CORREO_NO_DISPONIBLE', 'x'));
    await abrir();

    await pulsar('#verificar-enviar');

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos enviar el correo, intenta de nuevo.',
    );
    expect(elemento.querySelector<HTMLButtonElement>('#verificar-enviar')?.disabled).toBe(false);
    expect(elemento.querySelector('#verificar-codigo')).toBeNull();
  });

  it('429: pide esperar y deshabilita el reenvío con la cuenta regresiva del servidor', async () => {
    solicitar.mockRejectedValue(
      new ErrorApi(429, 'DEMASIADAS_SOLICITUDES', 'x', { reintentarEnSegundos: 90 }),
    );
    await abrir();

    await pulsar('#verificar-enviar');

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain('Demasiados intentos');
    expect(elemento.querySelector('#verificar-espera')?.textContent).toContain('1:30');
    expect(elemento.querySelector<HTMLButtonElement>('#verificar-enviar')?.disabled).toBe(true);
  });

  it('409 CORREO_YA_VERIFICADO: muestra que ya está verificado', async () => {
    solicitar.mockRejectedValue(new ErrorApi(409, 'CORREO_YA_VERIFICADO', 'x'));
    await abrir();

    await pulsar('#verificar-enviar');

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'Tu correo ya está verificado.',
    );
  });

  it('sin conexión: explica que se necesita conexión, sin controles que bloqueen la app', async () => {
    await abrir(false);

    expect(elemento.textContent).toContain('Necesitas conexión para verificar tu correo.');
    expect(elemento.textContent).toContain('Puedes seguir usando la app');
    expect(elemento.querySelector('#verificar-enviar')).toBeNull();
    expect(solicitar).not.toHaveBeenCalled();
  });

  it('si la conexión cae al pedir el código, muestra el mensaje de conexión', async () => {
    solicitar.mockRejectedValue(new ErrorSinConexion());
    await abrir();

    await pulsar('#verificar-enviar');

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'Necesitas conexión para verificar tu correo.',
    );
  });

  it('el campo solo admite dígitos (máximo 6) y valida los 6 dígitos antes de confirmar', async () => {
    await abrir();
    await pulsar('#verificar-enviar');

    escribirCodigo('48 2a9-13999');
    expect(elemento.querySelector<HTMLInputElement>('#verificar-codigo')?.value).toBe('482913');

    escribirCodigo('123');
    await confirmarFormulario();
    expect(elemento.textContent).toContain('El código tiene 6 dígitos.');
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('204 al confirmar: envía el código y avisa con toast «Correo verificado»', async () => {
    await abrir();
    await pulsar('#verificar-enviar');
    const aviso = vi.spyOn(TestBed.inject(MessageService), 'add');

    escribirCodigo('482913');
    await confirmarFormulario();

    expect(confirmar).toHaveBeenCalledWith('482913');
    expect(aviso).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Correo verificado' }),
    );
  });

  it('422: código incorrecto o vencido con el número de intento y, al quinto, que se agotaron', async () => {
    confirmar.mockRejectedValue(new ErrorApi(422, 'CODIGO_INVALIDO', 'x'));
    await abrir();
    await pulsar('#verificar-enviar');
    escribirCodigo('000000');

    await confirmarFormulario();
    expect(elemento.querySelector('#verificar-codigo-error')?.textContent).toContain(
      'El código no es válido o ya venció. Pide uno nuevo. Intento 1 de 5.',
    );

    for (let i = 0; i < 4; i += 1) await confirmarFormulario();
    expect(elemento.querySelector('#verificar-codigo-error')?.textContent).toContain(
      'Agotaste los 5 intentos de este código.',
    );
  });

  it('429 al confirmar muestra el aviso de demasiados intentos', async () => {
    confirmar.mockRejectedValue(new ErrorApi(429, 'DEMASIADAS_SOLICITUDES', 'x'));
    await abrir();
    await pulsar('#verificar-enviar');
    escribirCodigo('482913');

    await confirmarFormulario();

    expect(elemento.querySelector('#verificar-codigo-error')?.textContent).toContain(
      'Demasiados intentos',
    );
  });
});
