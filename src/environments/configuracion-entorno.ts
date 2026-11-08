/**
 * Forma de los archivos `environment*.ts`. Solo la URL de la API: nunca credenciales
 * (las de PayPhone viven en el backend, RN-16).
 */
export interface ConfiguracionEntorno {
  readonly produccion: boolean;
  /** URL base de la API, con `/api/v1`. En producción debe ser HTTPS (RNF-01). */
  readonly apiUrl: string;
  /**
   * Solo desarrollo con `ng serve --host 0.0.0.0`: si la app se abre desde otro equipo
   * (por ejemplo el navegador del celular en la red local), la API se busca en el mismo
   * host que sirve la app, con el puerto y la ruta de `apiUrl`. Así no se escribe la IP
   * de la PC en archivos versionados.
   */
  readonly apiEnMismoHost: boolean;
}
