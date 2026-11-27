import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonFooter } from '@ionic/angular';
import { ButtonDirective } from 'primeng/button';
import { Message } from 'primeng/message';
import { Skeleton } from 'primeng/skeleton';

import { CONECTIVIDAD } from '../../compartido/compartido.providers';
import { ErrorSinConexion } from '../../compartido/dominio/error-api';
import { BandaMarcaComponent } from '../../compartido/presentacion/banda-marca/banda-marca.component';
import { BarraPestanasComponent } from '../../compartido/presentacion/barra-pestanas/barra-pestanas.component';
import { ChipsFiltroComponent } from '../../compartido/presentacion/chips-filtro/chips-filtro.component';
import { CirculoMarcaComponent } from '../../compartido/presentacion/circulo-marca/circulo-marca.component';
import { HojaProductoComponent } from '../../compartido/presentacion/hoja-producto/hoja-producto.component';
import { LogoComponent } from '../../compartido/presentacion/logo/logo.component';
import { TarjetaProductoComponent } from '../../compartido/presentacion/tarjeta-producto/tarjeta-producto.component';
import { VistaMarca, VistaProducto } from '../../compartido/presentacion/vistas';
import { ConsultarMarcas } from '../../productos/aplicacion/casos-uso/consultar-marcas.caso-uso';
import { ConsultarProductos } from '../../productos/aplicacion/casos-uso/consultar-productos.caso-uso';
import { SIN_FILTROS } from '../../productos/dominio/consulta';
import { Disponibilidad, esDisponibilidad } from '../../productos/dominio/producto';
import {
  aVistaMarca,
  aVistaProducto,
  OPCIONES_DISPONIBILIDAD,
} from '../../productos/presentacion/vista-producto';
import { GestorSesion } from '../../usuarios/aplicacion/gestor-sesion';
import { primerNombre, Usuario } from '../../usuarios/dominio/sesion';

type Estado = 'cargando' | 'listo' | 'error' | 'sinConexion';

/** Cuántas tarjetas se ven en el carrusel de cada marca; «Ver todo» lleva a la lista completa. */
export const PRODUCTOS_POR_CARRUSEL = 10;

/** Una marca con su total y sus primeros productos (datos del servidor, RN-07). */
interface BloqueMarca {
  readonly marca: VistaMarca;
  readonly total: number;
  readonly productos: readonly VistaProducto[];
}

/**
 * Inicio del Cliente (rediseño, etapa 3): saludo, círculos de marca, chips de
 * disponibilidad y, por cada marca, su banner con un carrusel de productos. El detalle se
 * abre en una hoja inferior. Solo muestra datos reales del catálogo; sin conexión conserva lo
 * ya cargado como «no definitivo» (RN-07). La cuenta, el tema y la sesión viven en `/cuenta`.
 */
@Component({
  selector: 'app-inicio-cliente',
  imports: [
    IonContent,
    IonFooter,
    RouterLink,
    ButtonDirective,
    Message,
    Skeleton,
    LogoComponent,
    BandaMarcaComponent,
    BarraPestanasComponent,
    ChipsFiltroComponent,
    CirculoMarcaComponent,
    HojaProductoComponent,
    TarjetaProductoComponent,
  ],
  templateUrl: './inicio-cliente.page.html',
  styleUrl: './inicio-cliente.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InicioClientePage implements OnInit {
  private readonly gestor = inject(GestorSesion);
  private readonly consultarMarcas = inject(ConsultarMarcas);
  private readonly consultarProductos = inject(ConsultarProductos);
  private readonly conectividad = inject(CONECTIVIDAD);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly opcionesDisponibilidad = OPCIONES_DISPONIBILIDAD;
  protected readonly esqueletos = [1, 2, 3];

  protected readonly usuario = signal<Usuario | null>(this.gestor.actual()?.usuario ?? null);
  protected readonly enLinea = signal(true);
  protected readonly estado = signal<Estado>('cargando');
  protected readonly marcas = signal<readonly VistaMarca[]>([]);
  protected readonly bloques = signal<readonly BloqueMarca[]>([]);
  protected readonly disponibilidad = signal<Disponibilidad | null>(null);

  protected readonly seleccionado = signal<VistaProducto | null>(null);
  protected readonly hojaAbierta = signal(false);

  protected readonly saludo = computed(() => {
    const usuario = this.usuario();
    return usuario ? `Hola, ${primerNombre(usuario)}` : 'Hola';
  });

  /** Descarta respuestas de cargas anteriores si el Cliente cambió el filtro. */
  private secuencia = 0;

  ngOnInit(): void {
    const dejarDeOirSesion = this.gestor.suscribir((sesion) =>
      this.usuario.set(sesion?.usuario ?? null),
    );
    this.destroyRef.onDestroy(dejarDeOirSesion);
    this.destroyRef.onDestroy(() => this.secuencia++);

    void this.conectividad
      .alCambiar((conectado) => {
        this.enLinea.set(conectado);
        if (conectado && (this.estado() === 'sinConexion' || this.estado() === 'error')) {
          void this.cargar();
        }
      })
      .then((dejarDeOir) => this.destroyRef.onDestroy(dejarDeOir));

    void this.iniciar();
  }

  private async iniciar(): Promise<void> {
    this.enLinea.set(await this.conectividad.estaConectado());
    await this.cargar();
  }

  protected async cargar(): Promise<void> {
    const consulta = ++this.secuencia;
    this.estado.set('cargando');
    try {
      const marcas = await this.consultarMarcas.ejecutar();
      if (consulta !== this.secuencia) return;
      const vistas = marcas.map(aVistaMarca);
      this.marcas.set(vistas);

      const resultados = await Promise.allSettled(
        marcas.map((marca) =>
          this.consultarProductos.ejecutar(
            { ...SIN_FILTROS, marcaId: marca.id, disponibilidad: this.disponibilidad() },
            1,
          ),
        ),
      );
      if (consulta !== this.secuencia) return;

      // Si todas las consultas fallan se informa el error; si solo fallan algunas, se
      // muestran las marcas que sí cargaron.
      const fallidas = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (fallidas.length > 0 && fallidas.length === resultados.length) {
        throw fallidas[0]?.reason;
      }
      const bloques: BloqueMarca[] = [];
      resultados.forEach((resultado, indice) => {
        const marca = vistas[indice];
        if (resultado.status !== 'fulfilled' || !marca || resultado.value.elementos.length === 0) {
          return;
        }
        bloques.push({
          marca,
          total: resultado.value.total,
          productos: resultado.value.elementos.slice(0, PRODUCTOS_POR_CARRUSEL).map(aVistaProducto),
        });
      });
      this.bloques.set(bloques);
      this.estado.set('listo');
    } catch (error) {
      if (consulta !== this.secuencia) return;
      this.bloques.set([]);
      this.estado.set(error instanceof ErrorSinConexion ? 'sinConexion' : 'error');
    }
  }

  protected elegirDisponibilidad(valor: string | null): void {
    this.disponibilidad.set(esDisponibilidad(valor) ? valor : null);
    void this.cargar();
  }

  protected totalEnTexto(total: number): string {
    return `${total} ${total === 1 ? 'producto' : 'productos'}`;
  }

  /** Un círculo de marca o «Ver todo» abre Explorar con esa marca. */
  protected verMarca(marca: VistaMarca): void {
    void this.router.navigate(['/catalogo'], {
      queryParams: { marca: marca.id, disponibilidad: this.disponibilidad() ?? undefined },
    });
  }

  protected abrirDetalle(producto: VistaProducto): void {
    this.seleccionado.set(producto);
    this.hojaAbierta.set(true);
  }
}
