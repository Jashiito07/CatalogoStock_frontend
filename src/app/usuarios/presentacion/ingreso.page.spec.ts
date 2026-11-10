import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MessageService } from 'primeng/api';

import { URL_PANEL } from '../../compartido/compartido.providers';
import { ErrorApi, ErrorSinConexion } from '../../compartido/dominio/error-api';
import { IniciarSesion } from '../aplicacion/casos-uso/iniciar-sesion.caso-uso';
import { SESION_DE_PRUEBA } from '../pruebas/datos-de-prueba';
import { IngresoPage } from './ingreso.page';

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0));

describe('IngresoPage (RF-USU-01, CA-01, D-01, D-19)', () => {
  let ejecutar: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;

  async function abrir(url = '/ingreso'): Promise<HTMLElement> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, IngresoPage);
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  function escribir(elemento: HTMLElement, selector: string, valor: string): void {
    const input = elemento.querySelector<HTMLInputElement>(selector);
    if (!input) throw new Error(`No existe ${selector}`);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  async function enviar(elemento: HTMLElement): Promise<void> {
    elemento.querySelector('form')?.dispatchEvent(new Event('submit'));
    await esperar();
    harness.detectChanges();
    await esperar();
    harness.detectChanges();
  }

  beforeEach(() => {
    ejecutar = vi.fn(async () => SESION_DE_PRUEBA);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'ingreso', component: IngresoPage },
          { path: 'inicio', children: [] },
          { path: 'registro', children: [] },
        ]),
        MessageService,
        { provide: IniciarSesion, useValue: { ejecutar } },
        { provide: URL_PANEL, useValue: 'http://10.0.2.2:4201' },
      ],
    });
  });

  it('D-01: muestra siempre la nota para el Vendedor', async () => {
    const elemento = await abrir();
    expect(elemento.textContent).toContain(
      '¿Eres el vendedor? Administra tu negocio desde el panel web',
    );
  });

  it('D-37: el botón «Ir al panel del vendedor» abre el panel fuera de la app', async () => {
    const elemento = await abrir();

    const enlace = elemento.querySelector<HTMLAnchorElement>('#ingreso-panel');
    expect(enlace?.textContent).toContain('Ir al panel del vendedor');
    expect(enlace?.getAttribute('href')).toBe('http://10.0.2.2:4201');
    expect(enlace?.target).toBe('_blank');
    expect(enlace?.rel).toBe('noopener');
  });

  it('RF-USU-05: enlaza «¿Olvidaste tu clave?» con Recuperar clave', async () => {
    const elemento = await abrir();

    const enlace = Array.from(elemento.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('¿Olvidaste tu clave?'),
    );
    expect(enlace?.getAttribute('href')).toBe('/recuperar-clave');
  });

  it('RF-USU-05: avisa que la clave se cambió al volver de Recuperar clave', async () => {
    const elemento = await abrir('/ingreso?motivo=clave-restablecida');
    expect(elemento.querySelector('[role="status"]')?.textContent).toContain(
      'Tu clave se cambió. Inicia sesión con tu nueva clave.',
    );
  });

  it('D-38: muestra el ícono oficial como imagen', async () => {
    const elemento = await abrir();
    const logo = elemento.querySelector<HTMLImageElement>('app-logo img');
    expect(logo?.getAttribute('src')).toBe('marca/catalogostock-icono.svg');
    expect(logo?.alt).toBe('CatálogoStock');
  });

  it('valida el formulario en español antes de llamar a la API', async () => {
    const elemento = await abrir();

    await enviar(elemento);

    expect(elemento.textContent).toContain('Ingrese su correo.');
    expect(elemento.textContent).toContain('Ingrese su clave.');
    escribir(elemento, '#ingreso-correo', 'maria@');
    harness.detectChanges();
    expect(elemento.textContent).toContain('Ingrese un correo válido.');
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('CA-01: con credenciales válidas inicia sesión y va al inicio', async () => {
    const elemento = await abrir();
    const mensajes = TestBed.inject(MessageService);
    const aviso = vi.spyOn(mensajes, 'add');

    escribir(elemento, '#ingreso-correo', 'maria.zambrano@correo.com');
    escribir(elemento, '#ingreso-clave', 'Catalogo2026');
    await enviar(elemento);

    expect(ejecutar).toHaveBeenCalledWith({ correo: 'maria.zambrano@correo.com', clave: 'Catalogo2026' });
    expect(TestBed.inject(Router).url).toBe('/inicio');
    expect(aviso).toHaveBeenCalledWith(expect.objectContaining({ summary: '¡Hola, María!' }));
  });

  it('CA-01 / D-19: con credenciales incorrectas muestra «Correo o clave incorrectos.»', async () => {
    ejecutar.mockRejectedValue(new ErrorApi(401, 'CREDENCIALES_INVALIDAS', 'Correo o clave incorrectos.'));
    const elemento = await abrir();

    escribir(elemento, '#ingreso-correo', 'maria@correo.com');
    escribir(elemento, '#ingreso-clave', 'Incorrecta1');
    await enviar(elemento);

    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain('Correo o clave incorrectos.');
    expect(TestBed.inject(Router).url).toBe('/ingreso');
  });

  it('PLAN 1.6: sin conexión y sin sesión previa pide conexión', async () => {
    ejecutar.mockRejectedValue(new ErrorSinConexion());
    const elemento = await abrir();

    escribir(elemento, '#ingreso-correo', 'maria@correo.com');
    escribir(elemento, '#ingreso-clave', 'Catalogo2026');
    await enviar(elemento);

    expect(elemento.textContent).toContain('Necesitas conexión para iniciar sesión por primera vez.');
  });

  it('avisa cuando llega porque la sesión terminó', async () => {
    const elemento = await abrir('/ingreso?motivo=sesion-expirada');
    expect(elemento.textContent).toContain('Su sesión terminó. Vuelva a iniciar sesión.');
  });

  it('permite mostrar u ocultar la clave', async () => {
    const elemento = await abrir();
    const clave = elemento.querySelector<HTMLInputElement>('#ingreso-clave');
    expect(clave?.type).toBe('password');

    elemento.querySelector<HTMLButtonElement>('button[aria-label="Mostrar clave"]')?.click();
    harness.detectChanges();

    expect(clave?.type).toBe('text');
  });
});
