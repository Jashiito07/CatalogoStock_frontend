import { Conectividad } from '../../../compartido/aplicacion/puertos/conectividad.puerto';
import { ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { AvisoPrivacidad, ApiUsuarios } from '../puertos/api-usuarios.puerto';
import { CacheAvisoPrivacidad } from '../puertos/cache-aviso-privacidad.puerto';

export interface ResultadoAviso {
  readonly aviso: AvisoPrivacidad;
  /** `true` si se muestra la última versión guardada porque no hubo conexión. */
  readonly desdeCache: boolean;
}

/**
 * Aviso de privacidad vigente (RNF-16, PA-12, D-11). Con conexión lo descarga y guarda
 * la versión leída; sin conexión muestra la última guardada (contrato de usuarios).
 */
export class ConsultarAvisoPrivacidad {
  constructor(
    private readonly api: ApiUsuarios,
    private readonly cache: CacheAvisoPrivacidad,
    private readonly conectividad: Conectividad,
  ) {}

  async ejecutar(): Promise<ResultadoAviso> {
    if (await this.conectividad.estaConectado()) {
      try {
        const aviso = await this.api.obtenerAvisoPrivacidad();
        // El guardado en el dispositivo va en segundo plano: si SQLite tarda o falla,
        // el Cliente ve igual el aviso que ya se descargó (no se bloquea el registro).
        this.guardarEnSegundoPlano(aviso);
        return { aviso, desdeCache: false };
      } catch (error) {
        if (!(error instanceof ErrorSinConexion)) throw error;
      }
    }
    const guardado = await this.cache.leer().catch(() => null);
    if (guardado === null) throw new ErrorSinConexion();
    return { aviso: guardado, desdeCache: true };
  }

  private guardarEnSegundoPlano(aviso: AvisoPrivacidad): void {
    try {
      void this.cache.guardar(aviso).catch(() => undefined);
    } catch {
      // Un fallo síncrono del almacén tampoco impide mostrar el aviso.
    }
  }
}
