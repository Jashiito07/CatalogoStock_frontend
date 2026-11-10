import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Archivos del logo oficial copiados de `Contexto/catalogostock-logo` a `public/marca/`. */
export const ARCHIVOS_LOGO = {
  horizontal: 'marca/catalogostock-logo-horizontal.svg',
  icono: 'marca/catalogostock-icono.svg',
} as const;

export type VarianteLogo = keyof typeof ARCHIVOS_LOGO;

/**
 * Logo oficial de CatálogoStock (D-38). Se muestra como imagen y no como SVG en línea,
 * para evitar choques entre los `id` internos de los SVG.
 */
@Component({
  selector: 'app-logo',
  template: `<img
    class="logo"
    [class.logo--horizontal]="variante() === 'horizontal'"
    [class.logo--icono]="variante() === 'icono'"
    [src]="ruta()"
    alt="CatálogoStock"
    [attr.width]="variante() === 'horizontal' ? 3568 : 1024"
    [attr.height]="variante() === 'horizontal' ? 674 : 1024"
    decoding="async"
  />`,
  styles: `
    :host {
      display: inline-flex;
    }

    .logo {
      display: block;
      height: auto;
    }

    .logo--horizontal {
      width: var(--cs-logo-ancho, 14rem);
      max-width: 100%;
    }

    .logo--icono {
      width: var(--cs-logo-ancho, 4rem);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {
  readonly variante = input<VarianteLogo>('horizontal');

  protected readonly ruta = computed(() => ARCHIVOS_LOGO[this.variante()]);
}
