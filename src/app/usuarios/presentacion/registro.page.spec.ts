import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { ErrorApi, ErrorSinConexion } from '../../compartido/dominio/error-api';
import { ConsultarAvisoPrivacidad } from '../aplicacion/casos-uso/consultar-aviso-privacidad.caso-uso';
import { RegistrarCliente } from '../aplicacion/casos-uso/registrar-cliente.caso-uso';
import { SESION_DE_PRUEBA } from '../pruebas/datos-de-prueba';
import { AVISO_DE_PRUEBA } from '../pruebas/dobles';
import { RegistroPage } from './registro.page';

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0));

describe('RegistroPage (RF-USU-01, RNF-16, PA-12)', () => {
  let registrar: ReturnType<typeof vi.fn>;
  let consultarAviso: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<RegistroPage>;
  let elemento: HTMLElement;

  async function abrir(): Promise<void> {
    fixture = TestBed.createComponent(RegistroPage);
    elemento = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    await estabilizar();
  }

  async function estabilizar(): Promise<void> {
    await esperar();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function escribir(selector: string, valor: string): void {
    const input = elemento.querySelector<HTMLInputElement>(selector);
    if (!input) throw new Error(`No existe ${selector}`);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  function completarFormulario(): void {
    escribir('#registro-nombre', 'María Zambrano');
    escribir('#registro-correo', 'maria.zambrano@correo.com');
    escribir('#registro-telefono', '0991234567');
    escribir('#registro-clave', 'Catalogo2026');
    escribir('#registro-confirmacion', 'Catalogo2026');
    elemento.querySelector<HTMLInputElement>('#registro-privacidad')?.click();
    fixture.detectChanges();
  }

  async function enviar(): Promise<void> {
    elemento.querySelector('form')?.dispatchEvent(new Event('submit'));
    await estabilizar();
    await estabilizar();
  }

  beforeEach(() => {
    registrar = vi.fn(async () => ({ tipo: 'sesion-iniciada', sesion: SESION_DE_PRUEBA }));
    consultarAviso = vi.fn(async () => ({ aviso: AVISO_DE_PRUEBA, desdeCache: false }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'inicio', children: [] },
          { path: 'ingreso', children: [] },
        ]),
        MessageService,
        { provide: RegistrarCliente, useValue: { ejecutar: registrar } },
        { provide: ConsultarAvisoPrivacidad, useValue: { ejecutar: consultarAviso } },
      ],
    });
  });

  it('muestra los campos del registro con la confirmación de clave y la casilla del aviso', async () => {
    await abrir();

    for (const id of ['nombre', 'correo', 'telefono', 'clave', 'confirmacion', 'privacidad']) {
      expect(elemento.querySelector(`#registro-${id}`)).not.toBeNull();
    }
    expect(elemento.textContent).toContain('He leído y acepto el aviso de privacidad');
    expect(elemento.textContent).toContain('Leer el aviso de privacidad');
  });

  it('valida igual que el contrato y exige aceptar el aviso (RNF-16)', async () => {
    await abrir();

    await enviar();

    const texto = elemento.textContent ?? '';
    expect(texto).toContain('Ingrese su nombre (2 a 100 caracteres).');
    expect(texto).toContain('Ingrese un correo válido.');
    expect(texto).toContain('Ingrese un celular de Ecuador válido, por ejemplo 0991234567.');
    expect(texto).toContain('La clave debe tener entre 8 y 72 caracteres, con letras y números.');
    expect(texto).toContain('Debe aceptar el aviso de privacidad para crear su cuenta.');
    expect(registrar).not.toHaveBeenCalled();
  });

  it('avisa si la confirmación no coincide con la clave', async () => {
    await abrir();
    escribir('#registro-clave', 'Catalogo2026');
    escribir('#registro-confirmacion', 'Catalogo2027');
    elemento.querySelector<HTMLInputElement>('#registro-confirmacion')?.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(elemento.textContent).toContain('Las claves no coinciden.');
  });

  it('abre el aviso de privacidad en un diálogo y aceptarlo marca la casilla', async () => {
    await abrir();

    elemento.querySelector<HTMLButtonElement>('.registro__enlace')?.click();
    await estabilizar();

    expect(document.body.textContent).toContain('Aviso de privacidad de CatálogoStock');
    expect(document.body.textContent).toContain('PROVISIONAL - revisar antes de publicar');
    const acepto = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Acepto'),
    );
    acepto?.click();
    await estabilizar();

    expect(elemento.querySelector<HTMLInputElement>('#registro-privacidad')?.checked).toBe(true);
  });

  it('CA-01: registra con la versión del aviso y entra al inicio', async () => {
    await abrir();
    completarFormulario();

    await enviar();

    expect(registrar).toHaveBeenCalledWith(
      {
        nombre: 'María Zambrano',
        correo: 'maria.zambrano@correo.com',
        telefono: '0991234567',
        clave: 'Catalogo2026',
        confirmacionClave: 'Catalogo2026',
        aceptaPrivacidad: true,
      },
      '2026-11-1',
    );
    expect(TestBed.inject(Router).url).toBe('/inicio');
  });

  it('CORREO_YA_REGISTRADO marca el correo con un mensaje claro', async () => {
    registrar.mockRejectedValue(new ErrorApi(409, 'CORREO_YA_REGISTRADO', 'x'));
    await abrir();
    completarFormulario();

    await enviar();

    expect(elemento.textContent).toContain('Ya existe una cuenta con ese correo.');
  });

  it('PRIVACIDAD_DESACTUALIZADA vuelve a cargar el aviso y desmarca la casilla', async () => {
    registrar.mockRejectedValue(new ErrorApi(422, 'PRIVACIDAD_DESACTUALIZADA', 'x', { versionVigente: '2026-12-1' }));
    await abrir();
    completarFormulario();

    await enviar();

    expect(consultarAviso).toHaveBeenCalledTimes(2);
    expect(elemento.querySelector<HTMLInputElement>('#registro-privacidad')?.checked).toBe(false);
    expect(elemento.textContent).toContain('El aviso de privacidad cambió.');
  });

  it('sin conexión y sin aviso guardado ofrece reintentar y no deja enviar', async () => {
    consultarAviso.mockRejectedValue(new ErrorSinConexion());
    await abrir();

    expect(elemento.textContent).toContain('No se pudo cargar el aviso de privacidad.');
    expect(elemento.textContent).toContain('Reintentar');
    const crear = Array.from(elemento.querySelectorAll<HTMLButtonElement>('button[type="submit"]'))[0];
    expect(crear.disabled).toBe(true);
  });

  it('si la carga del aviso falla (base local sin respuesta), «Reintentar» lo vuelve a cargar y habilita «Crear cuenta»', async () => {
    consultarAviso.mockRejectedValueOnce(new Error('La base de datos local no respondió a tiempo.'));
    await abrir();

    expect(elemento.textContent).not.toContain('Cargando el aviso de privacidad');
    const reintentar = Array.from(elemento.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reintentar'),
    );
    expect(reintentar).toBeDefined();
    const crear = () => elemento.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(crear()?.disabled).toBe(true);

    reintentar?.click();
    await estabilizar();

    expect(consultarAviso).toHaveBeenCalledTimes(2);
    expect(elemento.textContent).toContain('Leer el aviso de privacidad');
    expect(crear()?.disabled).toBe(false);
  });
});
