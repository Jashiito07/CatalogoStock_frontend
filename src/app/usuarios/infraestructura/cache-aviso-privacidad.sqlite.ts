import { CLAVES_METADATOS } from '../../compartido/aplicacion/claves-metadatos';
import { BaseDatosLocal } from '../../compartido/aplicacion/puertos/base-datos-local.puerto';
import { CacheAvisoPrivacidad } from '../aplicacion/puertos/cache-aviso-privacidad.puerto';
import { AvisoPrivacidad, esAviso } from '../dominio/aviso-privacidad';

/**
 * Guarda la última versión leída del aviso de privacidad en la tabla local `metadatos`
 * (sin cambiar el esquema). El aviso es público y no contiene datos personales.
 */
export class CacheAvisoPrivacidadSqlite implements CacheAvisoPrivacidad {
  constructor(private readonly baseDatos: BaseDatosLocal) {}

  async leer(): Promise<AvisoPrivacidad | null> {
    const filas = await this.baseDatos.consultar<{ valor: string }>(
      'SELECT valor FROM metadatos WHERE clave = ?',
      [CLAVES_METADATOS.avisoPrivacidad],
    );
    const texto = filas[0]?.valor;
    if (texto === undefined) return null;
    try {
      const aviso: unknown = JSON.parse(texto);
      return esAviso(aviso) ? aviso : null;
    } catch {
      return null;
    }
  }

  async guardar(aviso: AvisoPrivacidad): Promise<void> {
    await this.baseDatos.ejecutar(
      'INSERT OR REPLACE INTO metadatos (clave, valor) VALUES (?, ?)',
      [CLAVES_METADATOS.avisoPrivacidad, JSON.stringify(aviso)],
    );
  }
}
