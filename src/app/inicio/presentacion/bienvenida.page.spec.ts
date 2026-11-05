import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';

import { BASE_DATOS_LOCAL } from '../../compartido/compartido.providers';
import {
  BaseDatosLocal,
  ResultadoEjecucion,
} from '../../compartido/aplicacion/puertos/base-datos-local.puerto';
import { BienvenidaPage } from './bienvenida.page';

const baseFalsa: BaseDatosLocal = {
  iniciar: async () => undefined,
  ejecutar: async (): Promise<ResultadoEjecucion> => ({ cambios: 0, ultimoId: null }),
  consultar: async <T extends object>() => [{ valor: '1' }] as T[],
  ejecutarTransaccion: async () => undefined,
};

describe('BienvenidaPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BienvenidaPage],
      providers: [MessageService, { provide: BASE_DATOS_LOCAL, useValue: baseFalsa }],
    }).compileComponents();
  });

  it('se crea y muestra el logo y las acciones en español', async () => {
    const fixture = TestBed.createComponent(BienvenidaPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance).toBeTruthy();
    expect(elemento.querySelector('h1')?.textContent).toContain('CatálogoStock');
    const botones = Array.from(elemento.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(botones).toEqual(['Comprobar base local', 'Ver catálogo']);
    expect(elemento.querySelector('p-badge')).not.toBeNull();
  });

  it('muestra que la base local abre con su versión de esquema', async () => {
    const fixture = TestBed.createComponent(BienvenidaPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Base local lista (esquema v1)',
    );
  });
});
