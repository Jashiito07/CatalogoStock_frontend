import { ConfiguracionEntorno } from './configuracion-entorno';

/**
 * Configuración de producción. Solo la URL base de la API: nunca credenciales
 * (las de PayPhone viven en el backend, RN-16).
 *
 * La URL definitiva (HTTPS, RNF-01) se fija al desplegar el backend. La app se niega a
 * arrancar en producción con una URL que no sea HTTPS (`resolverUrlApi`).
 */
export const environment: ConfiguracionEntorno = {
  produccion: true,
  apiUrl: 'https://api.catalogostock.local/api/v1',
  apiEnMismoHost: false,
};
