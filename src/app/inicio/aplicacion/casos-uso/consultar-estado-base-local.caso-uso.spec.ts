import {
  BaseDatosLocal,
  ResultadoEjecucion,
} from '../../../compartido/aplicacion/puertos/base-datos-local.puerto';
import { ConsultarEstadoBaseLocal } from './consultar-estado-base-local.caso-uso';

function baseFalsa(opciones: { falla?: boolean; version?: string }): BaseDatosLocal {
  return {
    iniciar: async () => {
      if (opciones.falla) {
        throw new Error('sin almacenamiento');
      }
    },
    ejecutar: async (): Promise<ResultadoEjecucion> => ({ cambios: 0, ultimoId: null }),
    consultar: async <T extends object>() =>
      (opciones.version === undefined ? [] : [{ valor: opciones.version }]) as T[],
    ejecutarTransaccion: async () => undefined,
  };
}

describe('ConsultarEstadoBaseLocal', () => {
  it('informa la versión del esquema cuando la base abre', async () => {
    const estado = await new ConsultarEstadoBaseLocal(baseFalsa({ version: '1' })).ejecutar();

    expect(estado).toEqual({ disponible: true, versionEsquema: 1 });
  });

  it('informa que no está disponible si la base no abre', async () => {
    const estado = await new ConsultarEstadoBaseLocal(baseFalsa({ falla: true })).ejecutar();

    expect(estado).toEqual({ disponible: false });
  });
});
