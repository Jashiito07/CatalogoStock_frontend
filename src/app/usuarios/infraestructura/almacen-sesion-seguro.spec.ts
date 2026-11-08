import { SESION_DE_PRUEBA } from '../pruebas/datos-de-prueba';
import {
  AlmacenSesionSeguro,
  AlmacenTexto,
  AlmacenTextoSesionNavegador,
  CLAVE_SESION,
  crearAlmacenTexto,
} from './almacen-sesion-seguro';

/** Doble de `Storage` (Node no expone `sessionStorage` en las pruebas). */
class StorageEnMemoria {
  private readonly datos = new Map<string, string>();
  get length() {
    return this.datos.size;
  }
  clear() {
    this.datos.clear();
  }
  getItem(clave: string) {
    return this.datos.get(clave) ?? null;
  }
  key(indice: number) {
    return [...this.datos.keys()][indice] ?? null;
  }
  removeItem(clave: string) {
    this.datos.delete(clave);
  }
  setItem(clave: string, valor: string) {
    this.datos.set(clave, valor);
  }
}

class AlmacenTextoEnMemoria implements AlmacenTexto {
  readonly datos = new Map<string, string>();
  async leer(clave: string) {
    return this.datos.get(clave) ?? null;
  }
  async escribir(clave: string, valor: string) {
    this.datos.set(clave, valor);
  }
  async borrar(clave: string) {
    this.datos.delete(clave);
  }
}

describe('AlmacenSesionSeguro (D-16)', () => {
  it('guarda, lee y borra la sesión', async () => {
    const almacen = new AlmacenSesionSeguro(new AlmacenTextoEnMemoria());

    expect(await almacen.leer()).toBeNull();
    await almacen.guardar(SESION_DE_PRUEBA);
    expect(await almacen.leer()).toEqual(SESION_DE_PRUEBA);
    await almacen.borrar();
    expect(await almacen.leer()).toBeNull();
  });

  it.each([['JSON dañado', '{no-es-json'], ['forma inesperada', '{"tokenAcceso":"x"}']])(
    'descarta una sesión guardada con %s',
    async (_caso, texto) => {
      const texto_ = new AlmacenTextoEnMemoria();
      texto_.datos.set(CLAVE_SESION, texto);
      const almacen = new AlmacenSesionSeguro(texto_);

      expect(await almacen.leer()).toBeNull();
      expect(texto_.datos.has(CLAVE_SESION)).toBe(false);
    },
  );

  it('en el navegador usa sessionStorage, nunca localStorage (contrato de usuarios)', async () => {
    const almacenSesion = new StorageEnMemoria();
    const texto = crearAlmacenTexto(false, () => almacenSesion as unknown as Storage);
    expect(texto).toBeInstanceOf(AlmacenTextoSesionNavegador);
    const almacen = new AlmacenSesionSeguro(texto);

    await almacen.guardar(SESION_DE_PRUEBA);
    expect(almacenSesion.getItem('catalogostock_sesion')).not.toBeNull();
    await almacen.borrar();
    expect(almacenSesion.length).toBe(0);
  });

  it('D-16: en Android usa el almacenamiento seguro del plugin', () => {
    const fabricaNavegador = vi.fn(() => new StorageEnMemoria() as unknown as Storage);
    expect(crearAlmacenTexto(true, fabricaNavegador)).not.toBeInstanceOf(AlmacenTextoSesionNavegador);
    expect(fabricaNavegador).not.toHaveBeenCalled();
  });
});
