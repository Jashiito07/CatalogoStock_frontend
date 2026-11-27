import { TestBed } from '@angular/core/testing';

import { VistaMarca } from '../vistas';
import { CirculoMarcaComponent, inicialesDeMarca } from './circulo-marca.component';

const MARCA: VistaMarca = {
  id: 'm1',
  nombre: "L'Bel",
  color: '#2E1A47',
  texto: '#FFFFFF',
  acento: null,
  textoAcento: null,
};

describe('inicialesDeMarca', () => {
  it.each([
    ['Yanbal', 'YA'],
    ["L'Bel", 'LB'],
    ['Leonisa', 'LE'],
    ['Esika Plus', 'EP'],
    ['', '?'],
  ])('«%s» → «%s»', (nombre, esperado) => {
    expect(inicialesDeMarca(nombre)).toBe(esperado);
  });
});

describe('CirculoMarcaComponent', () => {
  it('es un botón con aria-pressed, el color de la marca y su nombre; emite al tocarlo', () => {
    const fixture = TestBed.createComponent(CirculoMarcaComponent);
    fixture.componentRef.setInput('marca', MARCA);
    fixture.componentRef.setInput('activo', true);
    const elegida = vi.fn();
    fixture.componentInstance.seleccionar.subscribe(elegida);
    fixture.detectChanges();

    const boton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button');
    expect(boton?.getAttribute('aria-pressed')).toBe('true');
    expect(boton?.getAttribute('aria-label')).toBe("Marca L'Bel");
    expect(boton?.style.getPropertyValue('--marca-fondo')).toBe('#2E1A47');
    expect(boton?.style.getPropertyValue('--marca-texto')).toBe('#FFFFFF');
    expect(boton?.textContent).toContain('LB');
    boton?.click();
    expect(elegida).toHaveBeenCalledTimes(1);
  });
});
