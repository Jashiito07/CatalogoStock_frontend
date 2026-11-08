import { ErrorApi, ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { AvisoPrivacidad } from '../../dominio/aviso-privacidad';
import { AVISO_DE_PRUEBA, ConectividadFalsa, crearApiFalsa } from '../../pruebas/dobles';
import { CacheAvisoPrivacidad } from '../puertos/cache-aviso-privacidad.puerto';
import { ConsultarAvisoPrivacidad } from './consultar-aviso-privacidad.caso-uso';

class CacheEnMemoria implements CacheAvisoPrivacidad {
  constructor(public aviso: AvisoPrivacidad | null = null) {}
  async leer() {
    return this.aviso;
  }
  async guardar(aviso: AvisoPrivacidad) {
    this.aviso = aviso;
  }
}

describe('ConsultarAvisoPrivacidad (RNF-16, PA-12, D-11)', () => {
  it('con conexión descarga el aviso vigente y guarda la versión leída', async () => {
    const api = crearApiFalsa();
    const cache = new CacheEnMemoria();
    const caso = new ConsultarAvisoPrivacidad(api, cache, new ConectividadFalsa(true));

    expect(await caso.ejecutar()).toEqual({ aviso: AVISO_DE_PRUEBA, desdeCache: false });
    expect(cache.aviso).toEqual(AVISO_DE_PRUEBA);
  });

  it('sin conexión muestra la última versión guardada', async () => {
    const api = crearApiFalsa();
    const caso = new ConsultarAvisoPrivacidad(api, new CacheEnMemoria(AVISO_DE_PRUEBA), new ConectividadFalsa(false));

    expect(await caso.ejecutar()).toEqual({ aviso: AVISO_DE_PRUEBA, desdeCache: true });
    expect(api.obtenerAvisoPrivacidad).not.toHaveBeenCalled();
  });

  it('si la red falla usa la versión guardada', async () => {
    const api = crearApiFalsa();
    api.obtenerAvisoPrivacidad.mockRejectedValue(new ErrorSinConexion());
    const caso = new ConsultarAvisoPrivacidad(api, new CacheEnMemoria(AVISO_DE_PRUEBA), new ConectividadFalsa(true));

    expect((await caso.ejecutar()).desdeCache).toBe(true);
  });

  it('sin conexión y sin versión guardada informa que falta conexión', async () => {
    const caso = new ConsultarAvisoPrivacidad(crearApiFalsa(), new CacheEnMemoria(), new ConectividadFalsa(false));

    await expect(caso.ejecutar()).rejects.toBeInstanceOf(ErrorSinConexion);
  });

  it('devuelve el aviso descargado aunque el guardado en el dispositivo nunca termine', async () => {
    const cache: CacheAvisoPrivacidad = {
      leer: vi.fn(async () => null),
      // Simula SQLite web colgado: la promesa no se resuelve ni se rechaza nunca.
      guardar: vi.fn(() => new Promise<void>(() => undefined)),
    };
    const caso = new ConsultarAvisoPrivacidad(crearApiFalsa(), cache, new ConectividadFalsa(true));

    expect(await caso.ejecutar()).toEqual({ aviso: AVISO_DE_PRUEBA, desdeCache: false });
    expect(cache.guardar).toHaveBeenCalledWith(AVISO_DE_PRUEBA);
  });

  it('devuelve el aviso descargado aunque el guardado falle', async () => {
    const cache: CacheAvisoPrivacidad = {
      leer: vi.fn(async () => null),
      guardar: vi.fn(async () => {
        throw new Error('SQLite no disponible');
      }),
    };
    const caso = new ConsultarAvisoPrivacidad(crearApiFalsa(), cache, new ConectividadFalsa(true));

    expect((await caso.ejecutar()).aviso).toEqual(AVISO_DE_PRUEBA);
  });

  it('un error del servidor no se oculta con la versión guardada', async () => {
    const api = crearApiFalsa();
    api.obtenerAvisoPrivacidad.mockRejectedValue(new ErrorApi(500, 'ERROR_INTERNO', 'x'));
    const caso = new ConsultarAvisoPrivacidad(api, new CacheEnMemoria(AVISO_DE_PRUEBA), new ConectividadFalsa(true));

    await expect(caso.ejecutar()).rejects.toBeInstanceOf(ErrorApi);
  });
});
