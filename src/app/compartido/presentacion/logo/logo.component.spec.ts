import { TestBed } from '@angular/core/testing';

import { ServicioTema } from '../tema/servicio-tema';
import { LogoComponent } from './logo.component';

describe('LogoComponent (D-38, N2)', () => {
  function logo(variante: 'horizontal' | 'icono') {
    const fixture = TestBed.createComponent(LogoComponent);
    fixture.componentRef.setInput('variante', variante);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('img') as HTMLImageElement;
  }

  it('en modo claro usa el logo horizontal normal', () => {
    expect(logo('horizontal').getAttribute('src')).toBe('marca/catalogostock-logo-horizontal.svg');
  });

  it('en modo oscuro usa el logo horizontal para fondo oscuro', () => {
    TestBed.inject(ServicioTema).temaAplicado.set('oscuro');
    expect(logo('horizontal').getAttribute('src')).toBe(
      'marca/catalogostock-logo-horizontal-fondo-oscuro.svg',
    );
  });

  it('el ícono es el mismo en ambos modos', () => {
    TestBed.inject(ServicioTema).temaAplicado.set('oscuro');
    expect(logo('icono').getAttribute('src')).toBe('marca/catalogostock-icono.svg');
  });
});
