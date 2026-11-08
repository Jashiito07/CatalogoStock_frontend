import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BASE_DATOS_LOCAL } from '../../compartido/compartido.providers';
import {
  BaseDatosLocal,
  ResultadoEjecucion,
} from '../../compartido/aplicacion/puertos/base-datos-local.puerto';
import { BienvenidaPage } from './bienvenida.page';

function crearBase(disponible: boolean): BaseDatosLocal {
  return {
    iniciar: async () => {
      if (!disponible) throw new Error('sin base');
    },
    ejecutar: async (): Promise<ResultadoEjecucion> => ({ cambios: 0, ultimoId: null }),
    consultar: async <T extends object>() => [{ valor: '1' }] as T[],
    ejecutarTransaccion: async () => undefined,
  };
}

async function abrir(disponible = true): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    imports: [BienvenidaPage],
    providers: [provideRouter([]), { provide: BASE_DATOS_LOCAL, useValue: crearBase(disponible) }],
  });
  const fixture = TestBed.createComponent(BienvenidaPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('BienvenidaPage (PLAN 1.6, PA-12)', () => {
  it('muestra el logo y lleva a crear cuenta o a iniciar sesión', async () => {
    const elemento = await abrir();

    expect(elemento.querySelector('h1')?.textContent).toContain('CatálogoStock');
    const enlaces = Array.from(elemento.querySelectorAll('a')).map((a) => ({
      texto: a.textContent?.trim(),
      destino: a.getAttribute('href'),
    }));
    expect(enlaces).toEqual([
      { texto: 'Crear cuenta', destino: '/registro' },
      { texto: 'Iniciar sesión', destino: '/ingreso' },
    ]);
    expect(elemento.querySelector('p-badge')).not.toBeNull();
  });

  it('no muestra avisos técnicos si la base local abre (RNF-06)', async () => {
    const elemento = await abrir(true);
    expect(elemento.querySelector('[role="alert"]')).toBeNull();
  });

  it('avisa si el almacenamiento del dispositivo no abre', async () => {
    const elemento = await abrir(false);
    expect(elemento.querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo abrir el almacenamiento del dispositivo.',
    );
  });
});
