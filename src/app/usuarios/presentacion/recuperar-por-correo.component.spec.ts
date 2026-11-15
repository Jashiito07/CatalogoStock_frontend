import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { ErrorApi, ErrorSinConexion } from '../../compartido/dominio/error-api';
import { RecuperarClave } from '../aplicacion/casos-uso/recuperar-clave.caso-uso';
import { SolicitarCodigoRecuperacion } from '../aplicacion/casos-uso/solicitar-codigo-recuperacion.caso-uso';
import { RecuperarPorCorreoComponent } from './recuperar-por-correo.component';

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0));

describe('RecuperarPorCorreoComponent (RF-USU-05, D-50; contrato correo.md)', () => {
  let solicitar: ReturnType<typeof vi.fn>;
  let recuperar: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<RecuperarPorCorreoComponent>;
  let elemento: HTMLElement;

  async function abrir(enLinea = true): Promise<void> {
    fixture = TestBed.createComponent(RecuperarPorCorreoComponent);
    fixture.componentRef.setInput('enLinea', enLinea);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    await esperar();
    fixture.detectChanges();
  }

  function escribir(selector: string, valor: string): void {
    const input = elemento.querySelector<HTMLInputElement>(selector);
    if (!input) throw new Error(`No existe ${selector}`);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  async function enviarFormulario(): Promise<void> {
    elemento.querySelector('form')?.dispatchEvent(new Event('submit'));
    await esperar();
    fixture.detectChanges();
    await esperar();
    fixture.detectChanges();
  }

  async function pasarAlPaso2(): Promise<void> {
    escribir('#correo-recuperar-correo', 'Maria.Zambrano@correo.com');
    await enviarFormulario();
  }

  function completarPaso2(): void {
    escribir('#correo-recuperar-codigo', '482913');
    escribir('#correo-recuperar-clave', 'NuevaClave2026');
    escribir('#correo-recuperar-confirmacion', 'NuevaClave2026');
  }

  beforeEach(() => {
    solicitar = vi.fn(async () => undefined);
    recuperar = vi.fn(async () => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'ingreso', children: [] }]),
        MessageService,
        { provide: SolicitarCodigoRecuperacion, useValue: { ejecutar: solicitar } },
        { provide: RecuperarClave, useValue: { ejecutar: recuperar } },
      ],
    });
  });

  it('paso 1: pide solo el correo y no muestra aún el formulario del código', async () => {
    await abrir();

    expect(elemento.querySelector('#correo-recuperar-correo')).not.toBeNull();
    expect(elemento.querySelector('#correo-recuperar-codigo')).toBeNull();
    expect(elemento.textContent).toContain('Enviar código a mi correo');
  });

  it('valida el correo en español antes de llamar a la API', async () => {
    await abrir();

    escribir('#correo-recuperar-correo', 'maria@');
    await enviarFormulario();

    expect(elemento.textContent).toContain('Ingrese un correo válido.');
    expect(solicitar).not.toHaveBeenCalled();
  });

  it('204: siempre muestra el mismo mensaje neutro y pasa al paso 2', async () => {
    await abrir();

    await pasarAlPaso2();

    expect(solicitar).toHaveBeenCalledWith('Maria.Zambrano@correo.com');
    expect(elemento.querySelector('#correo-mensaje-neutro')?.textContent?.trim()).toBe(
      'Si el correo está registrado y verificado, te enviamos un código.',
    );
    const codigo = elemento.querySelector<HTMLInputElement>('#correo-recuperar-codigo');
    expect(codigo?.getAttribute('autocomplete')).toBe('one-time-code');
    expect(codigo?.getAttribute('inputmode')).toBe('numeric');
  });

  it('el mensaje neutro es el mismo para cualquier correo (no revela si existe)', async () => {
    await abrir();
    await pasarAlPaso2();
    const primero = elemento.querySelector('#correo-mensaje-neutro')?.textContent?.trim();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        MessageService,
        { provide: SolicitarCodigoRecuperacion, useValue: { ejecutar: solicitar } },
        { provide: RecuperarClave, useValue: { ejecutar: recuperar } },
      ],
    });
    await abrir();
    escribir('#correo-recuperar-correo', 'no.existe@correo.com');
    await enviarFormulario();

    expect(elemento.querySelector('#correo-mensaje-neutro')?.textContent?.trim()).toBe(primero);
  });

  it('paso 2: «Reenviar código» queda en cuenta regresiva de 1:00', async () => {
    await abrir();
    await pasarAlPaso2();

    const reenviar = elemento.querySelector<HTMLButtonElement>('#correo-reenviar');
    expect(reenviar?.disabled).toBe(true);
    expect(reenviar?.textContent).toContain('Reenviar código en 1:00');
  });

  it('429 en el paso 1: pide esperar y no avanza', async () => {
    solicitar.mockRejectedValue(
      new ErrorApi(429, 'DEMASIADAS_SOLICITUDES', 'x', { reintentarEnSegundos: 40 }),
    );
    await abrir();

    await pasarAlPaso2();

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain('(40 s)');
    expect(elemento.querySelector('#correo-recuperar-codigo')).toBeNull();
    expect(elemento.textContent).toContain('Podrás pedir otro código en 0:40');
  });

  it('sin conexión (al abrir) deshabilita el envío y lo explica', async () => {
    await abrir(false);

    expect(elemento.querySelector<HTMLButtonElement>('#correo-enviar-codigo')?.disabled).toBe(true);
    expect(elemento.textContent).toContain('Necesitas conexión para cambiar tu clave.');
  });

  it('si la conexión cae al pedir el código, lo explica', async () => {
    solicitar.mockRejectedValue(new ErrorSinConexion());
    await abrir();

    await pasarAlPaso2();

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'Necesitas conexión para cambiar tu clave.',
    );
  });

  it('paso 2: valida código, clave y confirmación en español', async () => {
    await abrir();
    await pasarAlPaso2();

    escribir('#correo-recuperar-codigo', '12');
    escribir('#correo-recuperar-clave', 'corta');
    escribir('#correo-recuperar-confirmacion', 'otra');
    await enviarFormulario();

    expect(elemento.textContent).toContain('El código tiene 6 dígitos.');
    expect(elemento.textContent).toContain('La clave debe tener entre 8 y 72 caracteres');
    expect(elemento.textContent).toContain('Las claves no coinciden.');
    expect(recuperar).not.toHaveBeenCalled();
  });

  it('el campo del código solo admite dígitos (máximo 6)', async () => {
    await abrir();
    await pasarAlPaso2();

    escribir('#correo-recuperar-codigo', '48a-29 13999');

    expect(elemento.querySelector<HTMLInputElement>('#correo-recuperar-codigo')?.value).toBe(
      '482913',
    );
  });

  it('204: restablece, avisa con toast y vuelve al ingreso', async () => {
    await abrir();
    await pasarAlPaso2();
    const mensajes = TestBed.inject(MessageService);
    const aviso = vi.spyOn(mensajes, 'add');

    completarPaso2();
    await enviarFormulario();

    expect(recuperar).toHaveBeenCalledWith({
      correo: 'Maria.Zambrano@correo.com',
      codigo: '482913',
      claveNueva: 'NuevaClave2026',
      confirmacionClave: 'NuevaClave2026',
    });
    expect(aviso).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    expect(TestBed.inject(Router).url).toBe('/ingreso?motivo=clave-restablecida');
  });

  it('422: mensaje de código incorrecto con el intento y sin salir de la pantalla', async () => {
    recuperar.mockRejectedValue(new ErrorApi(422, 'CODIGO_INVALIDO', 'x'));
    await abrir();
    await pasarAlPaso2();

    completarPaso2();
    await enviarFormulario();
    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'El código no es válido o ya venció. Pide uno nuevo. Intento 1 de 5.',
    );
    await enviarFormulario();
    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain('Intento 2 de 5.');
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('503 al restablecer muestra el aviso de reintento', async () => {
    recuperar.mockRejectedValue(new ErrorApi(503, 'CORREO_NO_DISPONIBLE', 'x'));
    await abrir();
    await pasarAlPaso2();

    completarPaso2();
    await enviarFormulario();

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos enviar el correo, intenta de nuevo.',
    );
  });

  it('«Usar otro correo» vuelve al paso 1', async () => {
    await abrir();
    await pasarAlPaso2();

    const boton = Array.from(elemento.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Usar otro correo'),
    );
    boton?.click();
    fixture.detectChanges();

    expect(elemento.querySelector('#correo-recuperar-correo')).not.toBeNull();
    expect(elemento.querySelector('#correo-recuperar-codigo')).toBeNull();
  });
});
