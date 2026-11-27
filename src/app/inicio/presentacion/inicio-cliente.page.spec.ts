import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Mock, vi } from 'vitest';

import { CONECTIVIDAD } from '../../compartido/compartido.providers';
import { ErrorSinConexion } from '../../compartido/dominio/error-api';
import { ConsultarMarcas } from '../../productos/aplicacion/casos-uso/consultar-marcas.caso-uso';
import { ConsultarProductos } from '../../productos/aplicacion/casos-uso/consultar-productos.caso-uso';
import { FiltroProductos, PaginaProductos } from '../../productos/dominio/consulta';
import {
  AVON,
  LEONISA,
  MARCAS_DE_PRUEBA,
  pagina,
  producto,
  YANBAL,
} from '../../productos/pruebas/datos-de-prueba';
import { GestorSesion } from '../../usuarios/aplicacion/gestor-sesion';
import { SESION_DE_PRUEBA } from '../../usuarios/pruebas/datos-de-prueba';
import {
  AlmacenSesionEnMemoria,
  ConectividadFalsa,
  crearApiFalsa,
} from '../../usuarios/pruebas/dobles';
import { InicioClientePage, PRODUCTOS_POR_CARRUSEL } from './inicio-cliente.page';

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0));

// El primer test compila los componentes de PrimeNG: con la máquina cargada supera los 5 s.
describe('InicioClientePage (rediseño etapa 3, RF-CAT-03, RF-CAT-05, D-10)', { timeout: 30000 }, () => {
  let conectividad: ConectividadFalsa;
  let productos: Mock<(filtro: FiltroProductos, pagina?: number) => Promise<PaginaProductos>>;
  let marcas: Mock<() => Promise<typeof MARCAS_DE_PRUEBA>>;

  const crema = producto('p1', 'Crema hidratante', '12.50', { urlImagen: 'http://api/i/1.jpg' });
  const labial = producto('p2', 'Labial mate rojo', '9.75', { disponibilidad: 'AGOTADO' });
  const bralette = producto('p3', 'Bralette', '15.00', { marca: LEONISA });

  async function abrir(): Promise<{ fixture: ComponentFixture<InicioClientePage>; elemento: HTMLElement }> {
    const gestor = new GestorSesion(crearApiFalsa(), new AlmacenSesionEnMemoria(SESION_DE_PRUEBA));
    await gestor.restaurar();
    TestBed.overrideProvider(GestorSesion, { useValue: gestor });
    const fixture = TestBed.createComponent(InicioClientePage);
    fixture.detectChanges();
    await refrescar(fixture);
    return { fixture, elemento: fixture.nativeElement as HTMLElement };
  }

  async function refrescar(fixture: ComponentFixture<InicioClientePage>): Promise<void> {
    await esperar();
    fixture.detectChanges();
    await esperar();
    fixture.detectChanges();
  }

  beforeEach(() => {
    conectividad = new ConectividadFalsa(true);
    // Por marca: Yanbal trae dos productos, Leonisa uno y las demás ninguno.
    productos = vi.fn(async (filtro: FiltroProductos) => {
      if (filtro.marcaId === YANBAL.id) return pagina([crema, labial], 118);
      if (filtro.marcaId === LEONISA.id) return pagina([bralette]);
      return pagina([]);
    });
    marcas = vi.fn(async () => MARCAS_DE_PRUEBA);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'catalogo', children: [] }]),
        { provide: GestorSesion, useValue: null },
        { provide: CONECTIVIDAD, useValue: conectividad },
        { provide: ConsultarProductos, useValue: { ejecutar: productos } },
        { provide: ConsultarMarcas, useValue: { ejecutar: marcas } },
      ],
    });
  });

  it('saluda al Cliente por su primer nombre y muestra el logo oficial (D-38)', async () => {
    const { elemento } = await abrir();

    expect(elemento.querySelector('h1')?.textContent).toContain('Hola, María');
    const logo = elemento.querySelector<HTMLImageElement>('app-logo img');
    expect(logo?.getAttribute('src')).toBe('marca/catalogostock-logo-horizontal.svg');
    expect(logo?.alt).toBe('CatálogoStock');
  });

  it('muestra un círculo por marca con sus iniciales', async () => {
    const { elemento } = await abrir();

    const circulos = Array.from(elemento.querySelectorAll('app-circulo-marca'));
    expect(circulos.map((c) => c.querySelector('.circulo__nombre')?.textContent?.trim())).toEqual([
      'Yanbal',
      'Avon',
      "L'Bel",
      'Leonisa',
    ]);
    expect(circulos[0]?.querySelector('p-avatar')?.textContent).toContain('YA');
    expect(circulos[2]?.querySelector('p-avatar')?.textContent).toContain('LB');
  });

  it('muestra un banner con carrusel por cada marca que tiene productos (D-43)', async () => {
    const { elemento } = await abrir();

    const bloques = elemento.querySelectorAll('.inicio__marca');
    expect(bloques).toHaveLength(2);
    const banda = bloques[0]?.querySelector<HTMLElement>('section.banda');
    expect(banda?.textContent).toContain('Yanbal');
    expect(banda?.textContent).toContain('118 productos');
    expect(banda?.style.getPropertyValue('--marca-fondo')).toBe(YANBAL.color);
    expect(banda?.style.getPropertyValue('--marca-texto')).toBe(YANBAL.textoSobreColor);
    const leonisa = bloques[1]?.querySelector<HTMLElement>('section.banda');
    expect(leonisa?.style.getPropertyValue('--marca-acento')).toBe('#F36E21');
    expect(leonisa?.textContent).toContain('1 producto');
    expect(bloques[0]?.querySelectorAll('app-tarjeta-producto')).toHaveLength(2);
  });

  it('las tarjetas muestran nombre, precio en texto, marca y disponibilidad sin ocultar los agotados', async () => {
    const { elemento } = await abrir();

    const tarjetas = elemento.querySelectorAll('.inicio__marca app-tarjeta-producto');
    expect(tarjetas[0]?.textContent).toContain('Crema hidratante');
    expect(tarjetas[0]?.textContent).toContain('$12.50');
    expect(tarjetas[0]?.textContent).toContain('Disponible');
    expect(tarjetas[0]?.querySelector('img')?.getAttribute('src')).toBe('http://api/i/1.jpg');
    expect(tarjetas[0]?.querySelector('img')?.getAttribute('loading')).toBe('lazy');
    expect(tarjetas[1]?.textContent).toContain('Agotado');
    expect(tarjetas[1]?.querySelector('img')).toBeNull();
    expect(tarjetas[1]?.querySelector('.pi-image')).not.toBeNull();
  });

  it('el carrusel muestra como máximo los primeros productos de cada marca', async () => {
    const muchos = Array.from({ length: 20 }, (_, i) => producto(`m${i}`, `Producto ${i}`, '1.00'));
    productos.mockImplementation(async (filtro) =>
      filtro.marcaId === YANBAL.id ? pagina(muchos, 50) : pagina([]),
    );
    const { elemento } = await abrir();

    expect(elemento.querySelectorAll('.inicio__marca app-tarjeta-producto')).toHaveLength(
      PRODUCTOS_POR_CARRUSEL,
    );
  });

  it('un círculo de marca y «Ver todo» abren Explorar con esa marca', async () => {
    const { fixture, elemento } = await abrir();
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate');

    elemento.querySelectorAll<HTMLButtonElement>('app-circulo-marca button')[1]?.click();
    await refrescar(fixture);
    expect(navegar).toHaveBeenLastCalledWith(['/catalogo'], {
      queryParams: { marca: AVON.id, disponibilidad: undefined },
    });

    elemento.querySelector<HTMLButtonElement>('.banda__boton')?.click();
    await refrescar(fixture);
    expect(navegar).toHaveBeenLastCalledWith(['/catalogo'], {
      queryParams: { marca: YANBAL.id, disponibilidad: undefined },
    });
  });

  it('RN-09: el chip de disponibilidad pide al servidor solo esa disponibilidad', async () => {
    const { fixture, elemento } = await abrir();
    productos.mockClear();

    const chip = Array.from(elemento.querySelectorAll<HTMLButtonElement>('app-chips-filtro button')).find(
      (b) => b.textContent?.includes('Agotado'),
    );
    chip?.click();
    await refrescar(fixture);

    expect(productos).toHaveBeenCalledWith(
      { marcaId: YANBAL.id, busqueda: '', disponibilidad: 'AGOTADO' },
      1,
    );
    expect(chip?.getAttribute('aria-pressed')).toBe('true');
  });

  it('el detalle se abre en una hoja inferior con foto, precio, disponibilidad y el carrito «Próximamente»', async () => {
    const { fixture, elemento } = await abrir();

    elemento.querySelector<HTMLButtonElement>('.inicio__marca app-tarjeta-producto button')?.click();
    await refrescar(fixture);

    const hoja = document.body.querySelector('.cs-hoja-producto');
    expect(hoja).not.toBeNull();
    expect(hoja?.textContent).toContain('Crema hidratante');
    expect(hoja?.textContent).toContain('$12.50');
    expect(hoja?.textContent).toContain('Disponible');
    expect(hoja?.textContent).toContain('Próximamente');
    expect(hoja?.querySelector('img')?.getAttribute('src')).toBe('http://api/i/1.jpg');
    const agregar = hoja?.querySelector<HTMLButtonElement>('.hoja__agregar');
    expect(agregar?.disabled).toBe(true);
    // El producto no inventa datos: no hay tallas, existencias ni cuentas regresivas.
    expect(hoja?.textContent).not.toMatch(/talla|quedan|oferta/i);
  });

  it('muestra la barra inferior con Inicio activo', async () => {
    const { elemento } = await abrir();

    const enlaces = Array.from(elemento.querySelectorAll('app-barra-pestanas a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(enlaces).toEqual(['/inicio', '/catalogo', '/cuenta']);
  });

  it('estado vacío: «Aún no hay productos» cuando no hay ninguno', async () => {
    productos.mockResolvedValue(pagina([]));
    const { elemento } = await abrir();

    expect(elemento.textContent).toContain('Aún no hay productos');
    expect(elemento.querySelector('.inicio__marca')).toBeNull();
  });

  it('muestra esqueletos mientras carga', async () => {
    marcas.mockReturnValue(new Promise(() => undefined));
    const { elemento } = await abrir();

    expect(elemento.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);
  });

  it('RNF-06 / RN-07: sin conexión avisa que los datos no son definitivos y «Reintentar» carga al volver la red', async () => {
    marcas.mockRejectedValue(new ErrorSinConexion());
    conectividad.conectado = false;
    const { fixture, elemento } = await abrir();

    expect(elemento.textContent).toContain('Sin conexión');
    expect(elemento.textContent).toContain('no definitivos');
    expect(elemento.textContent).toContain('Necesitas conexión para ver el catálogo');

    marcas.mockResolvedValue(MARCAS_DE_PRUEBA);
    conectividad.conectado = true;
    elemento.querySelector<HTMLButtonElement>('#inicio-reintentar')?.click();
    await refrescar(fixture);

    expect(elemento.querySelectorAll('.inicio__marca')).toHaveLength(2);
    expect(elemento.textContent).not.toContain('Necesitas conexión para ver el catálogo');
  });

  it('al recuperar la conexión recarga solo si el catálogo no había podido cargar', async () => {
    marcas.mockRejectedValueOnce(new ErrorSinConexion());
    conectividad.conectado = false;
    const { fixture, elemento } = await abrir();
    expect(elemento.querySelector('.inicio__marca')).toBeNull();

    conectividad.cambiar(true);
    await refrescar(fixture);

    expect(elemento.querySelectorAll('.inicio__marca')).toHaveLength(2);
  });

  it('si algunas marcas fallan, muestra las que sí cargaron', async () => {
    productos.mockImplementation(async (filtro) => {
      if (filtro.marcaId === AVON.id) throw new Error('falla');
      return filtro.marcaId === YANBAL.id ? pagina([crema]) : pagina([]);
    });
    const { elemento } = await abrir();

    expect(elemento.querySelectorAll('.inicio__marca')).toHaveLength(1);
  });

  it('error del servidor: mensaje claro sin detalles técnicos', async () => {
    productos.mockRejectedValue(new Error('stack interno'));
    const { elemento } = await abrir();

    expect(elemento.textContent).toContain('No pudimos cargar el catálogo');
    expect(elemento.textContent).not.toContain('stack interno');
  });
});
