import { PreferenciaTema } from '../../dominio/tema';

/** Preferencia de tema del Cliente, guardada en el dispositivo (tabla local `metadatos`). */
export interface AlmacenPreferenciaTema {
  /** `null` si nunca se eligió (se usa «automático»). */
  leer(): Promise<PreferenciaTema | null>;
  guardar(preferencia: PreferenciaTema): Promise<void>;
}
