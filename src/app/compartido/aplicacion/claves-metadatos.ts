/** Claves conocidas de la tabla local `metadatos`. */
export const CLAVES_METADATOS = {
  versionEsquema: 'version_esquema',
  /** Última versión leída del aviso de privacidad, en JSON (RNF-16; sin datos personales). */
  avisoPrivacidad: 'aviso_privacidad',
  /** Preferencia de tema: `automatico`, `claro` u `oscuro` (N2). */
  preferenciaTema: 'preferencia_tema',
} as const;
