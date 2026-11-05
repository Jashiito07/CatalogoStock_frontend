/**
 * Configuración de producción. Solo la URL base de la API: nunca credenciales
 * (las de PayPhone viven en el backend, RN-16).
 *
 * La URL definitiva (HTTPS, RNF-01) se fija al desplegar el backend.
 */
export const environment = {
  produccion: true,
  apiUrl: 'https://api.catalogostock.local/api/v1',
};
