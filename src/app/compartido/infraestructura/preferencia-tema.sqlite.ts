import { CLAVES_METADATOS } from '../aplicacion/claves-metadatos';
import { BaseDatosLocal } from '../aplicacion/puertos/base-datos-local.puerto';
import { AlmacenPreferenciaTema } from '../aplicacion/puertos/preferencia-tema.puerto';
import { esPreferenciaTema, PreferenciaTema } from '../dominio/tema';

/** Guarda la preferencia de tema en la tabla local `metadatos`, sin cambiar el esquema. */
export class PreferenciaTemaSqlite implements AlmacenPreferenciaTema {
  constructor(private readonly baseDatos: BaseDatosLocal) {}

  async leer(): Promise<PreferenciaTema | null> {
    const filas = await this.baseDatos.consultar<{ valor: string }>(
      'SELECT valor FROM metadatos WHERE clave = ?',
      [CLAVES_METADATOS.preferenciaTema],
    );
    const valor = filas[0]?.valor;
    return esPreferenciaTema(valor) ? valor : null;
  }

  async guardar(preferencia: PreferenciaTema): Promise<void> {
    await this.baseDatos.ejecutar(
      'INSERT OR REPLACE INTO metadatos (clave, valor) VALUES (?, ?)',
      [CLAVES_METADATOS.preferenciaTema, preferencia],
    );
  }
}
