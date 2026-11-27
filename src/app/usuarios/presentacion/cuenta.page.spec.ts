import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Confirmation, ConfirmationService, MessageService } from 'primeng/api';

import { CONECTIVIDAD } from '../../compartido/compartido.providers';
import { CLASE_TEMA_OSCURO, ServicioTema } from '../../compartido/presentacion/tema/servicio-tema';
import { ActualizarUsuarioActual } from '../aplicacion/casos-uso/actualizar-usuario-actual.caso-uso';
import { CerrarSesion } from '../aplicacion/casos-uso/cerrar-sesion.caso-uso';
import { GestorSesion } from '../aplicacion/gestor-sesion';
import { ConfirmarVerificacionCorreo } from '../aplicacion/casos-uso/confirmar-verificacion-correo.caso-uso';
import { SolicitarVerificacionCorreo } from '../aplicacion/casos-uso/solicitar-verificacion-correo.caso-uso';
import { SESION_CORREO_VERIFICADO, SESION_DE_PRUEBA } from '../pruebas/datos-de-prueba';
import { AlmacenSesionEnMemoria, ConectividadFalsa, crearApiFalsa } from '../pruebas/dobles';
import { CuentaPage } from './cuenta.page';

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0));

describe('CuentaPage (RF-USU-05, N2, D-10)', () => {
  let conectividad: ConectividadFalsa;
  let actualizar: ReturnType<typeof vi.fn>;
  let cerrar: ReturnType<typeof vi.fn>;

  async function abrir() {
    const gestor = new GestorSesion(crearApiFalsa(), new AlmacenSesionEnMemoria(SESION_DE_PRUEBA));
    await gestor.restaurar();
    TestBed.overrideProvider(GestorSesion, { useValue: gestor });
    const fixture = TestBed.createComponent(CuentaPage);
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
        { provide: SolicitarVerificacionCorreo, useValue: { ejecutar: vi.fn() } },
        { provide: ConfirmarVerificacionCorreo, useValue: { ejecutar: vi.fn() } },
      ],
    });
  });

  it('RF-USU-05: mientras correoVerificadoEn sea null muestra «Verifica tu correo» con «Enviar código»', async () => {
    const { elemento } = await abrir();

    const aviso = elemento.querySelector('app-verificar-correo');
    expect(aviso?.textContent).toContain('Verifica tu correo');
    expect(aviso?.textContent).toContain('maria.zambrano@correo.com');
    expect(aviso?.querySelector('#verificar-enviar')?.textContent).toContain('Enviar código');
  });

  it('RF-USU-05: el aviso desaparece cuando el correo queda verificado', async () => {
    const { fixture, elemento, gestor } = await abrir();

    await gestor.actualizarUsuario(SESION_CORREO_VERIFICADO.usuario);
    fixture.detectChanges();

    expect(elemento.querySelector('app-verificar-correo')).toBeNull();
  });

  it('RF-USU-05 / RNF-06: sin conexión el aviso no bloquea y explica que se necesita conexión', async () => {
    conectividad.conectado = false;
    const { elemento } = await abrir();

    const aviso = elemento.querySelector('app-verificar-correo');
    expect(aviso?.textContent).toContain('Necesitas conexión para verificar tu correo.');
    expect(aviso?.querySelector('#verificar-enviar')).toBeNull();
    expect(elemento.textContent).toContain('Cambiar mi clave');
  });

  it('muestra el perfil del Cliente (nombre, iniciales y correo) y el botón de cerrar sesión', async () => {
    const { elemento } = await abrir();

    expect(elemento.querySelector('h1')?.textContent).toContain('Cuenta');
    expect(elemento.querySelector('.cuenta__nombre')?.textContent).toContain('María Zambrano');
    expect(elemento.querySelector('p-avatar')?.textContent).toContain('MZ');
    expect(elemento.textContent).toContain('maria.zambrano@correo.com');
    expect(elemento.textContent).toContain('Cerrar sesión');
    expect(actualizar).toHaveBeenCalled();
  });

  it('RF-USU-05: «Datos» marca el correo como «Sin verificar» y, verificado, como «Verificado»', async () => {
    const { fixture, elemento, gestor } = await abrir();
    expect(elemento.querySelector('.cuenta__datos')?.textContent).toContain('Sin verificar');

    await gestor.actualizarUsuario(SESION_CORREO_VERIFICADO.usuario);
    fixture.detectChanges();

    const datos = elemento.querySelector('.cuenta__datos')?.textContent ?? '';
    expect(datos).toContain('Verificado');
    expect(datos).not.toContain('Sin verificar');
  });

  it('RF-USU-05: ofrece «Cambiar mi clave»', async () => {
    const { elemento } = await abrir();

    const enlace = Array.from(elemento.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('Cambiar mi clave'),
    );
    expect(enlace?.getAttribute('href')).toBe('/cambiar-clave');
  });

  it('rediseño: muestra la barra inferior con Cuenta activa y Carrito/Guardados como «Próximamente»', async () => {
    const { elemento } = await abrir();

    const barra = elemento.querySelector('app-barra-pestanas');
    expect(barra?.querySelectorAll('.barra__pestana')).toHaveLength(5);
    expect(barra?.querySelectorAll('button[disabled]')).toHaveLength(2);
    expect(barra?.textContent).toContain('Próximamente');
  });

  it('no ofrece eliminar la cuenta (función no definida en el DERCA)', async () => {
    const { elemento } = await abrir();

    expect(elemento.textContent?.toLowerCase()).not.toContain('eliminar cuenta');
  });

  it('N2: ofrece el selector Tema (Automático / Claro / Oscuro) y aplica la opción elegida', async () => {
    const { fixture, elemento } = await abrir();
    const tema = TestBed.inject(ServicioTema);

    const opciones = Array.from(elemento.querySelectorAll<HTMLElement>('p-selectbutton p-togglebutton'));
    expect(opciones.map((o) => o.textContent?.trim())).toEqual(['Automático', 'Claro', 'Oscuro']);
    expect(tema.preferencia()).toBe('automatico');

    const oscuro = opciones.find((o) => o.textContent?.trim() === 'Oscuro');
    oscuro?.click();
    fixture.detectChanges();
    await esperar();

    expect(tema.preferencia()).toBe('oscuro');
    expect(document.documentElement.classList.contains(CLASE_TEMA_OSCURO)).toBe(true);
    TestBed.inject(ServicioTema).ngOnDestroy();
    document.documentElement.classList.remove(CLASE_TEMA_OSCURO);
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

    expect(elemento.querySelector('.cuenta__nombre')?.textContent).toContain('Ana Pérez');
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
