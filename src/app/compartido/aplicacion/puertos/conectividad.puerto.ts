/**
 * Estado de la conexión del dispositivo (RNF-06). Lo usan los casos de uso que
 * requieren red (ingreso, registro, renovación) y, más adelante, la sincronización.
 */
export interface Conectividad {
  estaConectado(): Promise<boolean>;
  /** Avisa cada vez que cambia la conexión; devuelve la función para dejar de escuchar. */
  alCambiar(oyente: (conectado: boolean) => void): Promise<() => void>;
}
