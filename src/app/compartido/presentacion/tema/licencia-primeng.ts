/**
 * Opciones de licencia para `providePrimeNG` (D-59). Con la clave vacía no se pasa `license`:
 * PrimeNG muestra su aviso «Invalid PrimeUI License», pero la app sigue funcionando.
 */
export function opcionesLicencia(licencia: string): { license?: string } {
  return licencia ? { license: licencia } : {};
}
