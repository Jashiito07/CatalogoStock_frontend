import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Mock, vi } from 'vitest';

import { CONECTIVIDAD } from '../../compartido/compartido.providers';
import { ErrorApi, ErrorSinConexion } from '../../compartido/dominio/error-api';
import { ConectividadFalsa } from '../../usuarios/pruebas/dobles';
import { ConsultarMarcas } from '../aplicacion/casos-uso/consultar-marcas.caso-uso';
import { ConsultarProductos } from '../aplicacion/casos-uso/consultar-productos.caso-uso';
import { PaginaProductos } from '../dominio/consulta';
import { Disponibilidad } from '../dominio/producto';
import {
  AVON,
  LEONISA,
  MARCAS_DE_PRUEBA,
  pagina,
  producto,
  YANBAL,
} from '../pruebas/datos-de-prueba';
import { CatalogoPage, MENSAJE_SIN_CONEXION, RETARDO_BUSQUEDA_MS } from './catalogo.page';

const esperar = () => new Promise((resolver) => setTimeout(resolver, 0));

interface ControlesDelCatalogo {
  elegirDisponibilidad(valor: Disponibilidad | null): void;
}

// El primer test compila los componentes de PrimeNG: con la máquina cargada supera los 5 s.
describe('CatalogoPage (RF-CAT-03, RF-CAT-05, D-42)', { timeout: 30000 }, () => {
  let conectividad: ConectividadFalsa;
  let productos: Mock<(filtro: unknown, pagina?: number) => Promise<PaginaProductos>>;
  let marcas: Mock<() => Promise<typeof MARCAS_DE_PRUEBA>>;

  const crema = producto('p1', 'Crema hidratante', '12.50', { urlImagen: 'http://api/i/1.jpg' });
  const labial = producto('p2', 'Labial mate rojo', '9.75', { disponibilidad: 'AGOTADO' });
  const perfume = producto('p3', 'Perfume Far Away', '24.90', {
    marca: AVON,
    disponibilidad: 'PENDIENTE_REPOSICION',
  });

  async function abrir(): Promise<{ fixture: ComponentFixture<CatalogoPage>; elemento: HTMLElement }> {
    const fixture = TestBed.createComponent(CatalogoPage);
    fixture.detectChanges();
    await esperar();
    fixture.detectChanges();
    return { fixture, elemento: fixture.nativeElement as HTMLElement };
  }

  async function refrescar(fixture: ComponentFixture<CatalogoPage>): Promise<void> {
    await esperar();
    fixture.detectChanges();
    await esperar();
    fixture.detectChanges();
  }

  const boton = (elemento: HTMLElement, texto: string) =>
    Array.from(elemento.querySelectorAll('button')).find((b) => b.textContent?.includes(texto));

  beforeEach(() => {
    conectividad = new ConectividadFalsa(true);
    productos = vi.fn(async () => pagina([crema, labial, perfume]));
    marcas = vi.fn(async () => MARCAS_DE_PRUEBA);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'inicio', children: [] }]),
        { provide: CONECTIVIDAD, useValue: conectividad },
        { provide: ConsultarProductos, useValue: { ejecutar: productos } },
        { provide: ConsultarMarcas, useValue: { ejecutar: marcas } },
      ],
    });
  });

  it('D-41: muestra una tarjeta por producto con nombre, marca, precio en texto y disponibilidad', async () => {
    const { elemento } = await abrir();

    const filas = elemento.querySelectorAll('app-tarjeta-producto');
    expect(filas).toHaveLength(3);
    expect(filas[0].textContent).toContain('Crema hidratante');
    expect(filas[0].textContent).toContain('Yanbal');
    expect(filas[0].textContent).toContain('$12.50');
    expect(filas[0].textContent).toContain('Disponible');
    expect(filas[0].querySelector('img')?.getAttribute('src')).toBe('http://api/i/1.jpg');
    expect(elemento.textContent).toContain('3 productos');
  });

  it('RN-09 / RF-INV-03: los agotados y pendientes de reposición se muestran, no se ocultan', async () => {
    const { elemento } = await abrir();

    const textos = Array.from(elemento.querySelectorAll('app-tarjeta-producto')).map((f) => f.textContent);
    expect(textos[1]).toContain('Agotado');
    expect(textos[1]).toContain('Labial mate rojo');
    expect(textos[2]).toContain('Pendiente de reposición');
    expect(elemento.querySelector('.cs-etiqueta--mal')).not.toBeNull();
  });

  it('un producto sin imagen muestra el marcador (ícono) en lugar de la imagen', async () => {
    const { elemento } = await abrir();

    const sinImagen = elemento.querySelectorAll('app-tarjeta-producto')[1];
    expect(sinImagen.querySelector('img')).toBeNull();
    expect(sinImagen.querySelector('.pi-image')).not.toBeNull();
  });

  it('RF-CAT-05: la etiqueta de marca lleva su color y el texto calculado por el servidor', async () => {
    const { elemento } = await abrir();

    const etiqueta = elemento.querySelectorAll<HTMLElement>('.tarjeta__marca')[2];
    expect(etiqueta.style.getPropertyValue('--marca-fondo')).toBe(AVON.color);
    expect(etiqueta.style.getPropertyValue('--marca-texto')).toBe(AVON.textoSobreColor);
  });

  it('muestra esqueletos mientras carga', async () => {
    productos.mockReturnValue(new Promise(() => undefined));
    const { elemento } = await abrir();

    expect(elemento.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);
    expect(elemento.querySelector('app-tarjeta-producto')).toBeNull();
  });

  it('estado vacío: «Aún no hay productos» cuando no hay filtros', async () => {
    productos.mockResolvedValue(pagina([]));
    const { elemento } = await abrir();

    expect(elemento.textContent).toContain('Aún no hay productos');
    expect(elemento.querySelector('#catalogo-limpiar')).toBeNull();
  });

  it('CA-11: sin coincidencias avisa y «Limpiar filtros» restablece la lista', async () => {
    const { fixture, elemento } = await abrir();
    productos.mockResolvedValue(pagina([]));
    boton(elemento, 'Yanbal')?.click();
    await refrescar(fixture);

    expect(elemento.textContent).toContain('No hay productos que coincidan');
    productos.mockResolvedValue(pagina([crema]));
    elemento.querySelector<HTMLButtonElement>('#catalogo-limpiar')?.click();
    await refrescar(fixture);

    expect(productos).toHaveBeenLastCalledWith(
      { marcaId: null, busqueda: '', disponibilidad: null },
      1,
    );
    expect(elemento.querySelectorAll('app-tarjeta-producto')).toHaveLength(1);
  });

  it('RNF-06: sin conexión muestra el aviso del catálogo y «Reintentar» carga al volver la red', async () => {
    productos.mockRejectedValue(new ErrorSinConexion());
    marcas.mockRejectedValue(new ErrorSinConexion());
    conectividad.conectado = false;
    const { fixture, elemento } = await abrir();

    expect(elemento.textContent).toContain(MENSAJE_SIN_CONEXION);
    expect(MENSAJE_SIN_CONEXION).toBe(
      'Necesitas conexión para ver el catálogo; pronto estará disponible sin conexión.',
    );
    productos.mockResolvedValue(pagina([crema]));
    marcas.mockResolvedValue(MARCAS_DE_PRUEBA);
    conectividad.conectado = true;
    elemento.querySelector<HTMLButtonElement>('#catalogo-reintentar')?.click();
    await refrescar(fixture);

    expect(elemento.querySelectorAll('app-tarjeta-producto')).toHaveLength(1);
    expect(elemento.textContent).not.toContain(MENSAJE_SIN_CONEXION);
  });

  it('al recuperar la conexión recarga solo el catálogo que no pudo cargar', async () => {
    productos.mockRejectedValueOnce(new ErrorSinConexion());
    conectividad.conectado = false;
    const { fixture, elemento } = await abrir();
    expect(elemento.textContent).toContain(MENSAJE_SIN_CONEXION);

    conectividad.cambiar(true);
    await refrescar(fixture);

    expect(elemento.querySelectorAll('app-tarjeta-producto')).toHaveLength(3);
  });

  it('error del servidor: mensaje claro con «Reintentar», sin detalles técnicos', async () => {
    productos.mockRejectedValueOnce(new ErrorApi(500, 'ERROR_INTERNO', 'stack interno'));
    const { fixture, elemento } = await abrir();

    expect(elemento.textContent).toContain('No pudimos cargar el catálogo');
    expect(elemento.textContent).not.toContain('stack interno');
    elemento.querySelector<HTMLButtonElement>('#catalogo-reintentar')?.click();
    await refrescar(fixture);

    expect(elemento.querySelectorAll('app-tarjeta-producto')).toHaveLength(3);
  });

  it('RF-CAT-05: filtrar por marca pide al servidor y muestra la cabecera con su color y su acento', async () => {
    const { fixture, elemento } = await abrir();
    const circulos = Array.from(elemento.querySelectorAll('.catalogo__circulos .circulo__nombre')).map(
      (b) => b.textContent?.trim(),
    );
    expect(circulos).toEqual(['Yanbal', 'Avon', "L'Bel", 'Leonisa']);

    productos.mockResolvedValue(pagina([producto('p9', 'Bralette', '15.00', { marca: LEONISA })], 1));
    boton(elemento, 'Leonisa')?.click();
    await refrescar(fixture);

    expect(productos).toHaveBeenLastCalledWith(
      { marcaId: LEONISA.id, busqueda: '', disponibilidad: null },
      1,
    );
    const cabecera = elemento.querySelector<HTMLElement>('app-banda-marca section');
    expect(cabecera?.textContent).toContain('Leonisa');
    expect(cabecera?.textContent).toContain('1 producto');
    expect(cabecera?.style.getPropertyValue('--marca-fondo')).toBe('#222221');
    expect(cabecera?.style.getPropertyValue('--marca-texto')).toBe('#FFFFFF');
    expect(cabecera?.style.getPropertyValue('--marca-acento')).toBe('#F36E21');
    expect(cabecera?.style.getPropertyValue('--marca-texto-acento')).toBe('#1E293B');
    expect(boton(elemento, 'Leonisa')?.getAttribute('aria-pressed')).toBe('true');

    // Tocar otra vez el círculo de la marca elegida la quita del filtro.
    productos.mockResolvedValue(pagina([crema, labial, perfume]));
    boton(elemento, 'Leonisa')?.click();
    await refrescar(fixture);
    expect(productos).toHaveBeenLastCalledWith({ marcaId: null, busqueda: '', disponibilidad: null }, 1);
    expect(elemento.querySelector('app-banda-marca')).toBeNull();
  });

  it('RF-CAT-03: la búsqueda espera a que el Cliente deje de escribir', async () => {
    const { fixture, elemento } = await abrir();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      productos.mockClear();
      const campo = elemento.querySelector<HTMLInputElement>('#catalogo-busqueda');
      if (!campo) throw new Error('Falta el campo de búsqueda');

      for (const texto of ['c', 'cr', ' crema ']) {
        campo.value = texto;
        campo.dispatchEvent(new Event('input'));
        await vi.advanceTimersByTimeAsync(100);
      }
      expect(productos).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(RETARDO_BUSQUEDA_MS);
      fixture.detectChanges();

      expect(productos).toHaveBeenCalledTimes(1);
      expect(productos).toHaveBeenCalledWith(
        { marcaId: null, busqueda: 'crema', disponibilidad: null },
        1,
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('RN-09: filtrar por disponibilidad pide solo esa disponibilidad al servidor', async () => {
    const { fixture } = await abrir();
    productos.mockResolvedValue(pagina([labial]));

    (fixture.componentInstance as unknown as ControlesDelCatalogo).elegirDisponibilidad('AGOTADO');
    await refrescar(fixture);

    expect(productos).toHaveBeenLastCalledWith(
      { marcaId: null, busqueda: '', disponibilidad: 'AGOTADO' },
      1,
    );
    expect(fixture.nativeElement.textContent).toContain('Labial mate rojo');
  });

  it('paginación: «Ver más productos» pide la página siguiente y deja de ofrecerse al terminar', async () => {
    const primera = Array.from({ length: 20 }, (_, i) => producto(`a${i}`, `Producto ${i}`, '1.00'));
    const segunda = [producto('b0', 'Producto 20', '2.00')];
    productos.mockResolvedValueOnce(pagina(primera, 21, 1));
    const { fixture, elemento } = await abrir();
    expect(elemento.querySelectorAll('app-tarjeta-producto')).toHaveLength(20);

    productos.mockResolvedValueOnce(pagina(segunda, 21, 2));
    elemento.querySelector<HTMLButtonElement>('#catalogo-ver-mas')?.click();
    await refrescar(fixture);

    expect(productos).toHaveBeenLastCalledWith({ marcaId: null, busqueda: '', disponibilidad: null }, 2);
    expect(elemento.querySelectorAll('app-tarjeta-producto')).toHaveLength(21);
    expect(elemento.querySelector('#catalogo-ver-mas')).toBeNull();
  });

  it('RN-07: si falla al cargar más sin conexión, conserva lo cargado y avisa que no es definitivo', async () => {
    productos.mockResolvedValueOnce(pagina([crema, labial], 5, 1));
    const { fixture, elemento } = await abrir();

    productos.mockRejectedValueOnce(new ErrorSinConexion());
    elemento.querySelector<HTMLButtonElement>('#catalogo-ver-mas')?.click();
    await refrescar(fixture);

    expect(elemento.querySelectorAll('app-tarjeta-producto')).toHaveLength(2);
    expect(elemento.textContent).toContain('no definitivos');
    expect(elemento.textContent).toContain('No pudimos cargar más productos');

    productos.mockResolvedValueOnce(pagina([perfume], 5, 2));
    elemento.querySelector<HTMLButtonElement>('#catalogo-reintentar-mas')?.click();
    await refrescar(fixture);
    expect(elemento.querySelectorAll('app-tarjeta-producto')).toHaveLength(3);
  });

  it('los controles son de PrimeNG: búsqueda, chips de disponibilidad y barra inferior con Explorar activo', async () => {
    const { elemento } = await abrir();

    expect(elemento.querySelector('p-iconfield input.p-inputtext')).not.toBeNull();
    const chips = Array.from(elemento.querySelectorAll('app-chips-filtro button.p-button')).map((b) =>
      b.textContent?.trim(),
    );
    expect(chips).toEqual(['Todo', 'Disponible', 'Agotado', 'Pendiente de reposición']);
    expect(elemento.querySelector('app-chips-filtro button[aria-pressed="true"]')?.textContent).toContain('Todo');
    expect(elemento.querySelectorAll('app-barra-pestanas .barra__pestana')).toHaveLength(5);
    expect(YANBAL.nombre).toBe('Yanbal');
  });

  it('el chip de disponibilidad pide al servidor solo esa disponibilidad', async () => {
    const { fixture, elemento } = await abrir();
    productos.mockResolvedValue(pagina([labial]));

    const chip = Array.from(elemento.querySelectorAll<HTMLButtonElement>('app-chips-filtro button')).find(
      (b) => b.textContent?.includes('Agotado'),
    );
    chip?.click();
    await refrescar(fixture);

    expect(productos).toHaveBeenLastCalledWith(
      { marcaId: null, busqueda: '', disponibilidad: 'AGOTADO' },
      1,
    );
  });

  it('tocar una tarjeta abre el detalle en una hoja inferior con foto, precio y disponibilidad', async () => {
    const { fixture, elemento } = await abrir();

    elemento.querySelector<HTMLButtonElement>('app-tarjeta-producto button')?.click();
    await refrescar(fixture);

    const hoja = document.body.querySelector('.cs-hoja-producto');
    expect(hoja?.textContent).toContain('Crema hidratante');
    expect(hoja?.textContent).toContain('$12.50');
    expect(hoja?.textContent).toContain('Disponible');
    expect(hoja?.querySelector('img')?.getAttribute('src')).toBe('http://api/i/1.jpg');
    expect(hoja?.querySelector<HTMLButtonElement>('.hoja__agregar')?.disabled).toBe(true);
  });

  it('una agotada se muestra con la imagen atenuada y la etiqueta «Agotado» con ícono', async () => {
    const { elemento } = await abrir();

    const tarjeta = elemento.querySelectorAll('app-tarjeta-producto')[1];
    expect(tarjeta?.querySelector('.tarjeta__imagen--atenuada')).not.toBeNull();
    expect(tarjeta?.querySelector('.cs-etiqueta--mal .pi-ban')).not.toBeNull();
  });
});
