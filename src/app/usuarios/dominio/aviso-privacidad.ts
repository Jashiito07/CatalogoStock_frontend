/** Aviso de privacidad vigente (RNF-16, D-11, D-15), tal como lo entrega la API. */
export interface AvisoPrivacidad {
  readonly version: string;
  readonly titulo: string;
  /** Texto en un Markdown sencillo (ver `texto-aviso.ts`). */
  readonly contenido: string;
  readonly vigenteDesde: string;
}

/** Comprueba la forma del aviso recibido o guardado. */
export function esAviso(valor: unknown): valor is AvisoPrivacidad {
  if (typeof valor !== 'object' || valor === null) return false;
  const aviso = valor as Record<string, unknown>;
  return (
    typeof aviso['version'] === 'string' &&
    aviso['version'].length > 0 &&
    typeof aviso['titulo'] === 'string' &&
    typeof aviso['contenido'] === 'string' &&
    typeof aviso['vigenteDesde'] === 'string'
  );
}
