import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MessageService } from 'primeng/api';

import { CONECTIVIDAD } from '../../compartido/compartido.providers';
import { ErrorApi } from '../../compartido/dominio/error-api';
import { CambiarClave } from '../aplicacion/casos-uso/cambiar-clave.caso-uso';
import { ErrorSesionExpirada } from '../dominio/errores';
import { ConectividadFalsa } from '../pruebas/dobles';
import { CambiarClavePage } from './cambiar-clave.page';

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0));

describe('CambiarClavePage (RF-USU-05, POST /usuarios/yo/clave)', () => {
  let ejecutar: ReturnType<typeof vi.fn>;
  let conectividad: ConectividadFalsa;
  let harness: RouterTestingHarness;

  async function abrir(): Promise<HTMLElement> {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/cambiar-clave', CambiarClavePage);
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

  function completar(elemento: HTMLElement, actual = 'Catalogo2026', nueva = 'NuevaClave2026'): void {
    escribir(elemento, '#cambiar-clave-actual', actual);
    escribir(elemento, '#cambiar-clave-nueva', nueva);
    escribir(elemento, '#cambiar-clave-confirmacion', nueva);
  }

  async function enviar(elemento: HTMLElement): Promise<void> {
    elemento.querySelector('form')?.dispatchEvent(new Event('submit'));
    await esperar();
    harness.detectChanges();
    await esperar();
    harness.detectChanges();
  }

  beforeEach(() => {
    ejecutar = vi.fn(async () => undefined);
    conectividad = new ConectividadFalsa(true);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'cambiar-clave', component: CambiarClavePage },
          { path: 'inicio', children: [] },
          { path: 'ingreso', children: [] },
        ]),
        MessageService,
        { provide: CambiarClave, useValue: { ejecutar } },
        { provide: CONECTIVIDAD, useValue: conectividad },
      ],
    });
  });

  it('con datos válidos cambia la clave, avisa con un toast y vuelve al inicio', async () => {
    const elemento = await abrir();
    const aviso = vi.spyOn(TestBed.inject(MessageService), 'add');

    completar(elemento);
    await enviar(elemento);

    expect(ejecutar).toHaveBeenCalledWith({
      claveActual: 'Catalogo2026',
      claveNueva: 'NuevaClave2026',
      confirmacionClave: 'NuevaClave2026',
    });
    expect(aviso).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Clave cambiada' }),
    );
    expect(TestBed.inject(Router).url).toBe('/inicio');
  });

  it('la clave nueva igual a la actual se rechaza antes de llamar a la API', async () => {
    const elemento = await abrir();

    completar(elemento, 'Catalogo2026', 'Catalogo2026');
    await enviar(elemento);

    expect(elemento.textContent).toContain('La clave nueva debe ser distinta de la actual.');
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('422 CLAVE_ACTUAL_INCORRECTA marca la clave actual', async () => {
    ejecutar.mockRejectedValue(
      new ErrorApi(422, 'CLAVE_ACTUAL_INCORRECTA', 'La clave actual no es correcta.'),
    );
    const elemento = await abrir();

    completar(elemento, 'Equivocada1');
    await enviar(elemento);

    expect(elemento.querySelector('#cambiar-clave-actual-error')?.textContent).toContain(
      'La clave actual no es correcta.',
    );
    expect(TestBed.inject(Router).url).toBe('/cambiar-clave');
  });

  it.each([
    ['con el campo en detalles (forma real de la API)', {
      errores: [{ campo: 'claveNueva', errores: ['La clave nueva debe ser distinta de la actual.'] }],
    }],
    ['solo con el mensaje', {}],
  ])('400 «La clave nueva debe ser distinta de la actual.» %s marca la clave nueva', async (_caso, detalles) => {
    ejecutar.mockRejectedValue(
      new ErrorApi(400, 'DATOS_INVALIDOS', 'La clave nueva debe ser distinta de la actual.', detalles),
    );
    const elemento = await abrir();

    completar(elemento);
    await enviar(elemento);

    expect(elemento.textContent).toContain('La clave nueva debe ser distinta de la actual.');
    // El error queda en el campo, no como el genérico «Revise los datos del formulario.».
    expect(elemento.textContent).not.toContain('Revise los datos del formulario.');
  });

  it('sin conexión deshabilita el botón y explica que necesita conexión', async () => {
    conectividad.conectado = false;
    const elemento = await abrir();

    expect(elemento.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    expect(elemento.textContent).toContain('Necesitas conexión para cambiar tu clave');
    completar(elemento);
    await enviar(elemento);
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('si la sesión terminó, lleva al ingreso', async () => {
    ejecutar.mockRejectedValue(new ErrorSesionExpirada());
    const elemento = await abrir();

    completar(elemento);
    await enviar(elemento);
    await esperar();

    expect(TestBed.inject(Router).url).toBe('/ingreso?motivo=sesion-expirada');
  });
});
