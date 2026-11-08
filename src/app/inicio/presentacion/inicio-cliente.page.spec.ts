import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Confirmation, ConfirmationService, MessageService } from 'primeng/api';

import { CONECTIVIDAD } from '../../compartido/compartido.providers';
import { ActualizarUsuarioActual } from '../../usuarios/aplicacion/casos-uso/actualizar-usuario-actual.caso-uso';
import { CerrarSesion } from '../../usuarios/aplicacion/casos-uso/cerrar-sesion.caso-uso';
import { GestorSesion } from '../../usuarios/aplicacion/gestor-sesion';
import { SESION_DE_PRUEBA } from '../../usuarios/pruebas/datos-de-prueba';
import { AlmacenSesionEnMemoria, ConectividadFalsa, crearApiFalsa } from '../../usuarios/pruebas/dobles';
import { InicioClientePage } from './inicio-cliente.page';

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0));

describe('InicioClientePage (PLAN 1.6, D-10)', () => {
  let conectividad: ConectividadFalsa;
  let actualizar: ReturnType<typeof vi.fn>;
  let cerrar: ReturnType<typeof vi.fn>;

  async function abrir() {
    const gestor = new GestorSesion(crearApiFalsa(), new AlmacenSesionEnMemoria(SESION_DE_PRUEBA));
    await gestor.restaurar();
    TestBed.overrideProvider(GestorSesion, { useValue: gestor });
    const fixture = TestBed.createComponent(InicioClientePage);
    fixture.detectChanges();
    await esperar();
    fixture.detectChanges();
    return { fixture, elemento: fixture.nativeElement as HTMLElement, gestor };
  }

  beforeEach(() => {
    conectividad = new ConectividadFalsa(true);
    actualizar = vi.fn(async () => SESION_DE_PRUEBA.usuario);
    cerrar = vi.fn(async () => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'bienvenida', children: [] }]),
        MessageService,
        { provide: GestorSesion, useValue: null },
        { provide: CONECTIVIDAD, useValue: conectividad },
        { provide: ActualizarUsuarioActual, useValue: { ejecutar: actualizar } },
        { provide: CerrarSesion, useValue: { ejecutar: cerrar } },
      ],
    });
  });

  it('saluda al Cliente por su nombre y muestra el botón de cerrar sesión', async () => {
    const { elemento } = await abrir();

    expect(elemento.querySelector('h1')?.textContent).toContain('¡Hola, María!');
    expect(elemento.textContent).toContain('María Zambrano');
    expect(elemento.textContent).toContain('Cerrar sesión');
    expect(actualizar).toHaveBeenCalled();
  });

  it('D-10 / RN-07: sin conexión avisa que los datos guardados no son definitivos', async () => {
    conectividad.conectado = false;
    const { elemento } = await abrir();

    expect(elemento.textContent).toContain('Sin conexión');
    expect(elemento.textContent).toContain('no definitivos');
  });

  it('al recuperar la conexión refresca los datos (y renueva la sesión si hace falta)', async () => {
    conectividad.conectado = false;
    const { fixture, elemento } = await abrir();
    actualizar.mockClear();

    conectividad.cambiar(true);
    await esperar();
    fixture.detectChanges();

    expect(actualizar).toHaveBeenCalledTimes(1);
    expect(elemento.textContent).not.toContain('no definitivos');
  });

  it('muestra el nombre actualizado cuando cambia la sesión', async () => {
    const { fixture, elemento, gestor } = await abrir();

    await gestor.actualizarUsuario({ ...SESION_DE_PRUEBA.usuario, nombre: 'Ana Pérez' });
    fixture.detectChanges();

    expect(elemento.querySelector('h1')?.textContent).toContain('¡Hola, Ana!');
  });

  it('pide confirmación y, al aceptar, cierra la sesión y vuelve a la bienvenida', async () => {
    const { fixture, elemento } = await abrir();
    const confirmacion = fixture.debugElement.injector.get(ConfirmationService);
    let pedida: Confirmation | undefined;
    vi.spyOn(confirmacion, 'confirm').mockImplementation((c: Confirmation) => {
      pedida = c;
      return confirmacion;
    });

    const boton = Array.from(elemento.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Cerrar sesión'),
    );
    boton?.click();

    expect(pedida?.header).toBe('¿Cerrar sesión?');
    expect(cerrar).not.toHaveBeenCalled();
    pedida?.accept?.();
    await esperar();
    await esperar();

    expect(cerrar).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(Router).url).toBe('/bienvenida');
  });
});
