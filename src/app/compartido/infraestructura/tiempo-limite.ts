/** Error que se lanza cuando una operación no termina dentro del tiempo límite. */
export class ErrorTiempoAgotado extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorTiempoAgotado';
  }
}

/**
 * Devuelve una promesa que termina como `promesa` o se rechaza con `ErrorTiempoAgotado`
 * si pasan `milisegundos` sin respuesta. Sirve para que una operación colgada (por
 * ejemplo, SQLite web que aborta sin rechazar) no deje la interfaz esperando para siempre.
 */
export function conTiempoLimite<T>(
  promesa: Promise<T>,
  milisegundos: number,
  mensaje: string,
): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new ErrorTiempoAgotado(mensaje)), milisegundos);
  });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(temporizador));
}
