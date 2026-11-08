import { Injectable } from '@angular/core';
import { Network } from '@capacitor/network';

import { Conectividad } from '../aplicacion/puertos/conectividad.puerto';

/**
 * Adaptador de conectividad con `@capacitor/network` (en el navegador usa
 * `navigator.onLine`). Si el plugin falla, se asume conexión y la solicitud HTTP
 * decidirá: un fallo de red se trata como «sin conexión».
 */
@Injectable({ providedIn: 'root' })
export class ConectividadCapacitor implements Conectividad {
  async estaConectado(): Promise<boolean> {
    try {
      return (await Network.getStatus()).connected;
    } catch {
      return true;
    }
  }

  async alCambiar(oyente: (conectado: boolean) => void): Promise<() => void> {
    try {
      const manejador = await Network.addListener('networkStatusChange', (estado) =>
        oyente(estado.connected),
      );
      return () => void manejador.remove();
    } catch {
      return () => undefined;
    }
  }
}
