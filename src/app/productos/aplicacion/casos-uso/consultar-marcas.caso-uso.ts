import { Conectividad } from '../../../compartido/aplicacion/puertos/conectividad.puerto';
import { ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { Marca } from '../../dominio/marca';
import { ApiProductos } from '../puertos/api-productos.puerto';

/**
 * Consulta las marcas activas con su color (RF-CAT-05, D-43).
 *
 * Guarda en memoria la última lista recibida: si la conexión se pierde después, los
 * filtros por marca siguen disponibles con esos datos (no definitivos, RN-07). Es un
 * respaldo de la sesión; la persistencia en SQLite llega en la Fase 4 (RF-SIN-01).
 */
export class ConsultarMarcas {
  private ultimas: readonly Marca[] | null = null;

  constructor(
    private readonly api: ApiProductos,
    private readonly conectividad: Conectividad,
  ) {}

  /** `true` si hay una lista guardada de la sesión. */
  get hayRespaldo(): boolean {
    return this.ultimas !== null;
  }

  async ejecutar(): Promise<readonly Marca[]> {
    if (!(await this.conectividad.estaConectado())) return this.usarRespaldo();
    try {
      const marcas = (await this.api.listarMarcas()).filter((m) => m.activa);
      this.ultimas = marcas;
      return marcas;
    } catch (error) {
      if (error instanceof ErrorSinConexion) return this.usarRespaldo();
      throw error;
    }
  }

  private usarRespaldo(): readonly Marca[] {
    if (this.ultimas === null) throw new ErrorSinConexion();
    return this.ultimas;
  }
}
