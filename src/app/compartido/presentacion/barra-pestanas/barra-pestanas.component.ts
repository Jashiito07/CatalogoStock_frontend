import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface Pestana {
  readonly etiqueta: string;
  readonly icono: string;
  /** Ruta de la pestaña; `null` si la función llega en una fase posterior. */
  readonly ruta: string | null;
}

/** Pestañas de la app del Cliente. Carrito y Guardados se activan en sus fases (Fase 5). */
const PESTANAS: readonly Pestana[] = [
  { etiqueta: 'Inicio', icono: 'pi pi-home', ruta: '/inicio' },
  { etiqueta: 'Explorar', icono: 'pi pi-search', ruta: '/catalogo' },
  { etiqueta: 'Carrito', icono: 'pi pi-shopping-cart', ruta: null },
  { etiqueta: 'Guardados', icono: 'pi pi-heart', ruta: null },
  { etiqueta: 'Cuenta', icono: 'pi pi-user', ruta: '/cuenta' },
];

/**
 * Barra inferior de 5 pestañas. La navegación es de Angular (`routerLink`); Ionic solo
 * aporta el contenedor `ion-footer` de la página. Las pestañas de funciones futuras se ven
 * deshabilitadas y dicen «Próximamente». El área segura inferior queda cubierta.
 */
@Component({
  selector: 'app-barra-pestanas',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './barra-pestanas.component.html',
  styleUrl: './barra-pestanas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarraPestanasComponent {
  protected readonly pestanas = PESTANAS;
}
