import { CLAVES_METADATOS } from '../../../compartido/aplicacion/claves-metadatos';
import { BaseDatosLocal } from '../../../compartido/aplicacion/puertos/base-datos-local.puerto';

export type EstadoBaseLocal =
  | { readonly disponible: true; readonly versionEsquema: number }
  | { readonly disponible: false };

/** Verifica que la base local (SQLite) abre y devuelve la versión de su esquema. */
export class ConsultarEstadoBaseLocal {
  constructor(private readonly baseDatos: BaseDatosLocal) {}

  async ejecutar(): Promise<EstadoBaseLocal> {
    try {
      await this.baseDatos.iniciar();
      const filas = await this.baseDatos.consultar<{ valor: string }>(
        'SELECT valor FROM metadatos WHERE clave = ?',
        [CLAVES_METADATOS.versionEsquema],
      );
      return { disponible: true, versionEsquema: Number(filas[0]?.valor ?? 0) };
    } catch {
      return { disponible: false };
    }
  }
}
