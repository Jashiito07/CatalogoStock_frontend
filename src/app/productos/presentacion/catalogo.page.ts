import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonFooter } from '@ionic/angular';
import { ButtonDirective } from 'primeng/button';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Skeleton } from 'primeng/skeleton';
import { skip } from 'rxjs';

import { CONECTIVIDAD } from '../../compartido/compartido.providers';
import { ErrorSinConexion } from '../../compartido/dominio/error-api';
import { BandaMarcaComponent } from '../../compartido/presentacion/banda-marca/banda-marca.component';
import { BarraPestanasComponent } from '../../compartido/presentacion/barra-pestanas/barra-pestanas.component';
import { ChipsFiltroComponent } from '../../compartido/presentacion/chips-filtro/chips-filtro.component';
import { CirculoMarcaComponent } from '../../compartido/presentacion/circulo-marca/circulo-marca.component';
import { HojaProductoComponent } from '../../compartido/presentacion/hoja-producto/hoja-producto.component';
import { TarjetaProductoComponent } from '../../compartido/presentacion/tarjeta-producto/tarjeta-producto.component';
import { VistaMarca, VistaProducto } from '../../compartido/presentacion/vistas';
import { ConsultarMarcas } from '../aplicacion/casos-uso/consultar-marcas.caso-uso';
import { ConsultarProductos } from '../aplicacion/casos-uso/consultar-productos.caso-uso';
import {
  FiltroProductos,
  hayFiltros,
  hayMasProductos,
  LARGO_MAXIMO_BUSQUEDA,
  SIN_FILTROS,
} from '../dominio/consulta';
import { Marca } from '../dominio/marca';
import { Disponibilidad, esDisponibilidad, Producto } from '../dominio/producto';
import { aVistaMarca, aVistaProducto, OPCIONES_DISPONIBILIDAD } from './vista-producto';

/** Espera tras la última tecla antes de pedir la búsqueda al servidor (RF-CAT-03). */
export const RETARDO_BUSQUEDA_MS = 350;

export const MENSAJE_SIN_CONEXION =
  'Necesitas conexión para ver el catálogo; pronto estará disponible sin conexión.';

type Estado = 'cargando' | 'listo' | 'error' | 'sinConexion';

/** Parámetros de la ruta `/catalogo?marca=<id>&disponibilidad=<estado>` (accesos desde Inicio). */
const PARAMETRO_MARCA = 'marca';
const PARAMETRO_DISPONIBILIDAD = 'disponibilidad';
const PATRON_ID_MARCA = /^[\w-]{1,64}$/;

/**
 * Explorar: catálogo en línea con círculos de marca, chips de disponibilidad, banner de la
 * marca elegida y rejilla de tarjetas; el detalle se abre en una hoja inferior (RF-CAT-03,
 * RF-CAT-05, D-41, D-43). Pide al servidor; el catálogo en SQLite y sin conexión llega en la
 * Fase 4. No calcula precios, estados ni disponibilidad: los muestra como los entrega el
 * servidor (RN-07, RN-09).
 */
@Component({
  selector: 'app-catalogo',
  imports: [
    IonContent,
    IonFooter,
    FormsModule,
    ButtonDirective,
    IconField,
    InputIcon,
    InputText,
    Message,
    Skeleton,
    BandaMarcaComponent,
    BarraPestanasComponent,
    ChipsFiltroComponent,
    CirculoMarcaComponent,
    HojaProductoComponent,
    TarjetaProductoComponent,
  ],
  templateUrl: './catalogo.page.html',
  styleUrl: './catalogo.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoPage implements OnInit {
  private readonly consultarProductos = inject(ConsultarProductos);
  private readonly consultarMarcas = inject(ConsultarMarcas);
  private readonly conectividad = inject(CONECTIVIDAD);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly largoMaximoBusqueda = LARGO_MAXIMO_BUSQUEDA;
  protected readonly mensajeSinConexion = MENSAJE_SIN_CONEXION;
  protected readonly opcionesDisponibilidad = OPCIONES_DISPONIBILIDAD;
  protected readonly esqueletos = [1, 2, 3, 4];

  /** Producto abierto en la hoja inferior; se conserva al cerrar para la animación. */
  protected readonly seleccionado = signal<VistaProducto | null>(null);
  protected readonly hojaAbierta = signal(false);

  protected readonly marcas = signal<readonly Marca[]>([]);
  protected readonly productos = signal<readonly Producto[]>([]);
  protected readonly total = signal(0);
  protected readonly estado = signal<Estado>('cargando');
  protected readonly cargandoMas = signal(false);
  protected readonly errorAlCargarMas = signal(false);
  protected readonly enLinea = signal(true);

  // Filtros. La búsqueda tiene un texto de la caja (inmediato) y uno aplicado (con retardo).
  protected readonly marcaId = signal<string | null>(null);
  protected readonly disponibilidad = signal<Disponibilidad | null>(null);
  protected readonly textoBusqueda = signal('');
  private readonly busquedaAplicada = signal('');

  private readonly filtro = computed<FiltroProductos>(() => ({
    marcaId: this.marcaId(),
    busqueda: this.busquedaAplicada(),
    disponibilidad: this.disponibilidad(),
  }));
  protected readonly conFiltros = computed(() => hayFiltros(this.filtro()));
  protected readonly hayMas = computed(() => hayMasProductos(this.productos().length, this.total()));
  protected readonly vistaMarcas = computed<readonly VistaMarca[]>(() => this.marcas().map(aVistaMarca));
  /** Marca elegida: su banner (RF-CAT-05, D-43). */
  protected readonly cabecera = computed<VistaMarca | null>(
    () => this.vistaMarcas().find((m) => m.id === this.marcaId()) ?? null,
  );
  protected readonly vistaProductos = computed<readonly VistaProducto[]>(() =>
    this.productos().map(aVistaProducto),
  );
  protected readonly resumen = computed(() => {
    const total = this.total();
    return `${total} ${total === 1 ? 'producto' : 'productos'}`;
  });

  private readonly centinela = viewChild<ElementRef<HTMLElement>>('centinela');
  private observador: IntersectionObserver | null = null;
  private temporizadorBusqueda: ReturnType<typeof setTimeout> | null = null;
  /** Descarta respuestas de consultas anteriores si el Cliente cambió los filtros. */
  private secuencia = 0;
  /** Última página cargada de la consulta en curso. */
  private paginaActual = 1;

  constructor() {
    // Carga automática al llegar al final de la lista (el botón «Ver más» es el respaldo).
    effect(() => {
      const elemento = this.centinela()?.nativeElement;
      this.productos(); // vuelve a observar tras cada página para revisar si sigue visible
      this.observador?.disconnect();
      if (elemento && this.observador) this.observador.observe(elemento);
    });
    this.destroyRef.onDestroy(() => {
      this.observador?.disconnect();
      if (this.temporizadorBusqueda !== null) clearTimeout(this.temporizadorBusqueda);
      this.secuencia++;
    });
  }

  ngOnInit(): void {
    if (typeof IntersectionObserver !== 'undefined') {
      this.observador = new IntersectionObserver((entradas) => {
        if (entradas.some((e) => e.isIntersecting)) void this.cargarMas();
      });
    }

    void this.conectividad
      .alCambiar((conectado) => {
        this.enLinea.set(conectado);
        if (!conectado) return;
        if (this.estado() === 'sinConexion' || this.estado() === 'error') void this.reintentar();
        else if (this.marcas().length === 0) void this.cargarMarcas();
      })
      .then((dejarDeOir) => this.destroyRef.onDestroy(dejarDeOir));

    // Acceso desde Inicio («Ver todo» o un círculo de marca): llega con la marca en la ruta.
    this.aplicarParametros(false);
    this.ruta.queryParamMap
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.aplicarParametros(true));

    void this.iniciar();
  }

  /** Lee marca y disponibilidad de la ruta; con `recargar` vuelve a pedir la lista. */
  private aplicarParametros(recargar: boolean): void {
    const parametros = this.ruta.snapshot.queryParamMap;
    const marca = parametros.get(PARAMETRO_MARCA);
    const disponible = parametros.get(PARAMETRO_DISPONIBILIDAD);
    if (marca === null && disponible === null && !recargar) return;
    const nuevaMarca = marca !== null && PATRON_ID_MARCA.test(marca) ? marca : null;
    const nuevaDisponibilidad = esDisponibilidad(disponible) ? disponible : null;
    if (nuevaMarca === this.marcaId() && nuevaDisponibilidad === this.disponibilidad()) return;
    this.marcaId.set(nuevaMarca);
    this.disponibilidad.set(nuevaDisponibilidad);
    if (recargar) void this.cargarPrimeraPagina();
  }

  private async iniciar(): Promise<void> {
    this.enLinea.set(await this.conectividad.estaConectado());
    await Promise.all([this.cargarMarcas(), this.cargarPrimeraPagina()]);
  }

  private async cargarMarcas(): Promise<void> {
    try {
      this.marcas.set(await this.consultarMarcas.ejecutar());
    } catch {
      // Sin marcas no hay chips; el listado y su error se gestionan por separado.
    }
  }

  private async cargarPrimeraPagina(): Promise<void> {
    const consulta = ++this.secuencia;
    this.estado.set('cargando');
    this.errorAlCargarMas.set(false);
    this.cargandoMas.set(false);
    try {
      const pagina = await this.consultarProductos.ejecutar(this.filtro(), 1);
      if (consulta !== this.secuencia) return;
      this.productos.set(pagina.elementos);
      this.total.set(pagina.total);
      this.paginaActual = 1;
      this.estado.set('listo');
    } catch (error) {
      if (consulta !== this.secuencia) return;
      this.productos.set([]);
      this.total.set(0);
      this.estado.set(error instanceof ErrorSinConexion ? 'sinConexion' : 'error');
    }
  }

  protected async cargarMas(): Promise<void> {
    if (this.estado() !== 'listo' || this.cargandoMas() || !this.hayMas()) return;
    const consulta = this.secuencia;
    const siguiente = this.paginaActual + 1;
    this.cargandoMas.set(true);
    this.errorAlCargarMas.set(false);
    try {
      const pagina = await this.consultarProductos.ejecutar(this.filtro(), siguiente);
      if (consulta !== this.secuencia) return;
      const existentes = new Set(this.productos().map((p) => p.id));
      this.productos.update((actuales) => [
        ...actuales,
        ...pagina.elementos.filter((p) => !existentes.has(p.id)),
      ]);
      this.total.set(pagina.total);
      this.paginaActual = siguiente;
    } catch (error) {
      if (consulta !== this.secuencia) return;
      // Se conservan los productos ya cargados (no definitivos si no hay conexión, RN-07).
      this.errorAlCargarMas.set(true);
      if (error instanceof ErrorSinConexion) this.enLinea.set(false);
    } finally {
      if (consulta === this.secuencia) this.cargandoMas.set(false);
    }
  }

  protected reintentar(): Promise<void> {
    const faltanMarcas = this.marcas().length === 0 ? this.cargarMarcas() : Promise.resolve();
    return Promise.all([faltanMarcas, this.cargarPrimeraPagina()]).then(() => undefined);
  }

  /** Tocar el círculo de la marca elegida la quita del filtro. */
  protected elegirMarca(id: string | null): void {
    const nueva = this.marcaId() === id ? null : id;
    if (this.marcaId() === nueva) return;
    this.marcaId.set(nueva);
    void this.cargarPrimeraPagina();
  }

  protected elegirDisponibilidad(valor: Disponibilidad | null): void {
    this.disponibilidad.set(valor);
    void this.cargarPrimeraPagina();
  }

  /** Los chips entregan texto; solo se aceptan los estados del servidor. */
  protected elegirDisponibilidadChip(valor: string | null): void {
    this.elegirDisponibilidad(esDisponibilidad(valor) ? valor : null);
  }

  protected abrirDetalle(producto: VistaProducto): void {
    this.seleccionado.set(producto);
    this.hojaAbierta.set(true);
  }

  /** Búsqueda con retardo: se pide al servidor cuando el Cliente deja de escribir. */
  protected escribirBusqueda(texto: string): void {
    this.textoBusqueda.set(texto);
    if (this.temporizadorBusqueda !== null) clearTimeout(this.temporizadorBusqueda);
    this.temporizadorBusqueda = setTimeout(() => {
      this.temporizadorBusqueda = null;
      this.aplicarBusqueda();
    }, RETARDO_BUSQUEDA_MS);
  }

  private aplicarBusqueda(): void {
    const texto = this.textoBusqueda().trim();
    if (texto === this.busquedaAplicada()) return;
    this.busquedaAplicada.set(texto);
    void this.cargarPrimeraPagina();
  }

  /** CA-11: sin resultados, el Cliente puede limpiar los filtros con un toque. */
  protected limpiarFiltros(): void {
    if (this.temporizadorBusqueda !== null) clearTimeout(this.temporizadorBusqueda);
    this.temporizadorBusqueda = null;
    this.textoBusqueda.set('');
    this.busquedaAplicada.set(SIN_FILTROS.busqueda);
    this.marcaId.set(SIN_FILTROS.marcaId);
    this.disponibilidad.set(SIN_FILTROS.disponibilidad);
    void this.cargarPrimeraPagina();
  }

}
