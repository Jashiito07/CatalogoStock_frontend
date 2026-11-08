import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Capacitor } from '@capacitor/core';

import { AlmacenSesion } from '../aplicacion/puertos/almacen-sesion.puerto';
import { esSesion, Sesion } from '../dominio/sesion';

/** Prefijo propio para no chocar con otros plugins que usen el almacenamiento seguro. */
export const PREFIJO_ALMACEN_SEGURO = 'catalogostock_';
export const CLAVE_SESION = 'sesion';

/** Operaciones mínimas de un almacén clave-valor de texto. */
export interface AlmacenTexto {
  leer(clave: string): Promise<string | null>;
  escribir(clave: string, valor: string): Promise<void>;
  borrar(clave: string): Promise<void>;
}

/**
 * Android/iOS: `@aparajita/capacitor-secure-storage` (D-16), cifrado con el Keystore de
 * Android. El prefijo se fija una vez antes de usarlo.
 */
class AlmacenTextoSeguroNativo implements AlmacenTexto {
  private preparado: Promise<void> | null = null;

  private preparar(): Promise<void> {
    this.preparado ??= SecureStorage.setKeyPrefix(PREFIJO_ALMACEN_SEGURO).catch((error: unknown) => {
      this.preparado = null;
      throw error;
    });
    return this.preparado;
  }

  async leer(clave: string): Promise<string | null> {
    await this.preparar();
    return SecureStorage.getItem(clave);
  }

  async escribir(clave: string, valor: string): Promise<void> {
    await this.preparar();
    await SecureStorage.setItem(clave, valor);
  }

  async borrar(clave: string): Promise<void> {
    await this.preparar();
    await SecureStorage.removeItem(clave);
  }
}

/**
 * Navegador (solo desarrollo con `ng serve`): el plugin, en web, usaría `localStorage`,
 * que el contrato prohíbe. Se usa `sessionStorage`: la sesión sobrevive a recargar la
 * página y se pierde al cerrar la pestaña. La app real es el APK.
 */
export class AlmacenTextoSesionNavegador implements AlmacenTexto {
  constructor(private readonly almacen: Storage) {}

  async leer(clave: string): Promise<string | null> {
    return this.almacen.getItem(PREFIJO_ALMACEN_SEGURO + clave);
  }

  async escribir(clave: string, valor: string): Promise<void> {
    this.almacen.setItem(PREFIJO_ALMACEN_SEGURO + clave, valor);
  }

  async borrar(clave: string): Promise<void> {
    this.almacen.removeItem(PREFIJO_ALMACEN_SEGURO + clave);
  }
}

export function crearAlmacenTexto(
  esNativo = Capacitor.isNativePlatform(),
  almacenNavegador: () => Storage = () => sessionStorage,
): AlmacenTexto {
  return esNativo
    ? new AlmacenTextoSeguroNativo()
    : new AlmacenTextoSesionNavegador(almacenNavegador());
}

/**
 * Adaptador del puerto `AlmacenSesion` (D-16). Guarda la sesión como JSON; si al leerla
 * está dañada, la descarta.
 */
export class AlmacenSesionSeguro implements AlmacenSesion {
  constructor(private readonly almacen: AlmacenTexto = crearAlmacenTexto()) {}

  async leer(): Promise<Sesion | null> {
    const texto = await this.almacen.leer(CLAVE_SESION);
    if (texto === null) return null;
    try {
      const sesion: unknown = JSON.parse(texto);
      if (esSesion(sesion)) return sesion;
    } catch {
      // JSON dañado: se descarta abajo.
    }
    await this.almacen.borrar(CLAVE_SESION);
    return null;
  }

  async guardar(sesion: Sesion): Promise<void> {
    await this.almacen.escribir(CLAVE_SESION, JSON.stringify(sesion));
  }

  async borrar(): Promise<void> {
    await this.almacen.borrar(CLAVE_SESION);
  }
}
