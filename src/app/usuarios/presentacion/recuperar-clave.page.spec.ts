import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { CONECTIVIDAD } from '../../compartido/compartido.providers';
import { ErrorApi, ErrorSinConexion } from '../../compartido/dominio/error-api';
import { RecuperarClave } from '../aplicacion/casos-uso/recuperar-clave.caso-uso';
import { ConectividadFalsa } from '../pruebas/dobles';
import { RecuperarClavePage } from './recuperar-clave.page';

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0));

describe('RecuperarClavePage (RF-USU-05, D-35, D-39)', () => {
  let ejecutar: ReturnType<typeof vi.fn>;
  let conectividad: ConectividadFalsa;
  let harness: RouterTestingHarness;

  async function abrir(): Promise<HTMLElement> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/recuperar-clave', RecuperarClavePage);
    harness.detectChanges();
    await esperar();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  function escribir(elemento: HTMLElement, selector: string, valor: string): void {
    const input = elemento.querySelector<HTMLInputElement>(selector);
    if (!input) throw new Error(`No existe ${selector}`);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  function completar(elemento: HTMLElement): void {
    escribir(elemento, '#recuperar-correo', 'maria.zambrano@correo.com');
    escribir(elemento, '#recuperar-codigo', '482913');
    escribir(elemento, '#recuperar-clave-nueva', 'NuevaClave2026');
    escribir(elemento, '#recuperar-confirmacion', 'NuevaClave2026');
  }

  async function enviar(elemento: HTMLElement): Promise<void> {
    elemento.querySelector('form')?.dispatchEvent(new Event('submit'));
    await esperar();
    harness.detectChanges();
    await esperar();
    harness.detectChanges();
  }

  function botonEnviar(elemento: HTMLElement): HTMLButtonElement | null {
    return elemento.querySelector<HTMLButtonElement>('button[type="submit"]');
  }

  beforeEach(() => {
    ejecutar = vi.fn(async () => undefined);
    conectividad = new ConectividadFalsa(true);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'recuperar-clave', component: RecuperarClavePage },
          { path: 'ingreso', children: [] },
        ]),
        { provide: RecuperarClave, useValue: { ejecutar } },
        { provide: CONECTIVIDAD, useValue: conectividad },
      ],
    });
  });

  it('explica que el código lo da el vendedor y pide el código con teclado numérico', async () => {
    const elemento = await abrir();

    expect(elemento.textContent).toContain('Pide a tu vendedor un código de recuperación');
    const codigo = elemento.querySelector<HTMLInputElement>('#recuperar-codigo');
    expect(codigo?.getAttribute('inputmode')).toBe('numeric');
    expect(elemento.querySelector<HTMLImageElement>('app-logo img')?.alt).toBe('CatálogoStock');
  });

  it('valida en español antes de llamar a la API', async () => {
    const elemento = await abrir();

    escribir(elemento, '#recuperar-correo', 'maria@');
    escribir(elemento, '#recuperar-codigo', '12a');
    escribir(elemento, '#recuperar-clave-nueva', 'corta');
    escribir(elemento, '#recuperar-confirmacion', 'otra');
    await enviar(elemento);

    expect(elemento.textContent).toContain('Ingrese un correo válido.');
    expect(elemento.textContent).toContain('El código tiene 6 dígitos.');
    expect(elemento.textContent).toContain('La clave debe tener entre 8 y 72 caracteres');
    expect(elemento.textContent).toContain('Las claves no coinciden.');
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('al recuperar vuelve al ingreso con el aviso de clave cambiada', async () => {
    const elemento = await abrir();

    completar(elemento);
    await enviar(elemento);

    expect(ejecutar).toHaveBeenCalledWith({
      correo: 'maria.zambrano@correo.com',
      codigo: '482913',
      claveNueva: 'NuevaClave2026',
      confirmacionClave: 'NuevaClave2026',
    });
    expect(TestBed.inject(Router).url).toBe('/ingreso?motivo=clave-restablecida');
  });

  it('422 CODIGO_INVALIDO muestra el mensaje único del contrato', async () => {
    ejecutar.mockRejectedValue(new ErrorApi(422, 'CODIGO_INVALIDO', 'x'));
    const elemento = await abrir();

    completar(elemento);
    await enviar(elemento);

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'El código no es válido o ya venció. Pide uno nuevo a tu vendedor.',
    );
    expect(TestBed.inject(Router).url).toBe('/recuperar-clave');
  });

  it('D-17: 429 pide esperar', async () => {
    ejecutar.mockRejectedValue(
      new ErrorApi(429, 'DEMASIADAS_SOLICITUDES', 'x', { reintentarEnSegundos: 60 }),
    );
    const elemento = await abrir();

    completar(elemento);
    await enviar(elemento);

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'Demasiados intentos. Espere un momento e inténtelo de nuevo. (60 s)',
    );
  });

  it('sin conexión deshabilita el botón y explica que necesita conexión', async () => {
    conectividad.conectado = false;
    const elemento = await abrir();

    expect(botonEnviar(elemento)?.disabled).toBe(true);
    expect(botonEnviar(elemento)?.textContent).toContain('Restablecer clave');
    expect(elemento.textContent).not.toContain('Cambiar mi clave');
    expect(elemento.textContent).toContain('Necesitas conexión para cambiar tu clave');

    completar(elemento);
    await enviar(elemento);
    expect(ejecutar).not.toHaveBeenCalled();

    conectividad.cambiar(true);
    harness.detectChanges();
    expect(botonEnviar(elemento)?.disabled).toBe(false);
  });

  it('si la conexión cae al enviar, lo explica', async () => {
    ejecutar.mockRejectedValue(new ErrorSinConexion());
    const elemento = await abrir();

    completar(elemento);
    await enviar(elemento);

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'Necesitas conexión para cambiar tu clave.',
    );
  });
});
