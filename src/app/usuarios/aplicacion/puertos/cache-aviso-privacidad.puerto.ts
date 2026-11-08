import { AvisoPrivacidad } from './api-usuarios.puerto';

/**
 * Última versión leída del aviso de privacidad, para mostrarla sin conexión
 * (contrato de usuarios, `GET /privacidad/aviso`). No contiene datos personales.
 */
export interface CacheAvisoPrivacidad {
  leer(): Promise<AvisoPrivacidad | null>;
  guardar(aviso: AvisoPrivacidad): Promise<void>;
}
