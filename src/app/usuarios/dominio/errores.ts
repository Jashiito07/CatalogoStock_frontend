/**
 * Errores propios del módulo usuarios. Los errores de la API (`ErrorApi`,
 * `ErrorSinConexion`) están en `compartido/dominio/error-api.ts`. TypeScript puro.
 */

/**
 * La sesión ya no se puede renovar (401 `TOKEN_INVALIDO` o no hay sesión):
 * hay que volver a ingresar.
 */
export class ErrorSesionExpirada extends Error {
  constructor() {
    super('La sesión terminó. Vuelva a iniciar sesión.');
    this.name = 'ErrorSesionExpirada';
  }
}

/** El formulario no cumple las reglas del contrato; no se llamó a la API. */
export class ErrorDatosFormulario extends Error {
  constructor(readonly errores: Readonly<Record<string, string>>) {
    super('Revise los datos del formulario.');
    this.name = 'ErrorDatosFormulario';
  }
}
