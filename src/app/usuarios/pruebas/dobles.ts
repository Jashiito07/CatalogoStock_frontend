import { Mocked, vi } from 'vitest';

import { Conectividad } from '../../compartido/aplicacion/puertos/conectividad.puerto';
import { AlmacenSesion } from '../aplicacion/puertos/almacen-sesion.puerto';
import { ApiUsuarios } from '../aplicacion/puertos/api-usuarios.puerto';
import { AvisoPrivacidad } from '../dominio/aviso-privacidad';
import { Sesion } from '../dominio/sesion';
import { SESION_DE_PRUEBA } from './datos-de-prueba';

/** Dobles de prueba de los puertos del módulo usuarios. */

export const AVISO_DE_PRUEBA: AvisoPrivacidad = {
  version: '2026-11-1',
  titulo: 'Aviso de privacidad de CatálogoStock',
  contenido: 'PROVISIONAL - revisar antes de publicar\n\n# Aviso\n\nTexto.',
  vigenteDesde: '2026-11-05T00:00:00-05:00',
};

export function crearApiFalsa(): Mocked<ApiUsuarios> {
  return {
    registrar: vi.fn<ApiUsuarios['registrar']>(async () => SESION_DE_PRUEBA.usuario),
    ingresarCliente: vi.fn<ApiUsuarios['ingresarCliente']>(async () => SESION_DE_PRUEBA),
    renovar: vi.fn<ApiUsuarios['renovar']>(async () => SESION_DE_PRUEBA),
    salir: vi.fn<ApiUsuarios['salir']>(async () => undefined),
    obtenerUsuarioActual: vi.fn<ApiUsuarios['obtenerUsuarioActual']>(
      async () => SESION_DE_PRUEBA.usuario,
    ),
    obtenerAvisoPrivacidad: vi.fn<ApiUsuarios['obtenerAvisoPrivacidad']>(
      async () => AVISO_DE_PRUEBA,
    ),
  };
}

export class AlmacenSesionEnMemoria implements AlmacenSesion {
  constructor(public guardada: Sesion | null = null) {}

  async leer(): Promise<Sesion | null> {
    return this.guardada;
  }

  async guardar(sesion: Sesion): Promise<void> {
    this.guardada = sesion;
  }

  async borrar(): Promise<void> {
    this.guardada = null;
  }
}

export class ConectividadFalsa implements Conectividad {
  private oyentes: ((conectado: boolean) => void)[] = [];

  constructor(public conectado = true) {}

  async estaConectado(): Promise<boolean> {
    return this.conectado;
  }

  async alCambiar(oyente: (conectado: boolean) => void): Promise<() => void> {
    this.oyentes.push(oyente);
    return () => {
      this.oyentes = this.oyentes.filter((o) => o !== oyente);
    };
  }

  cambiar(conectado: boolean): void {
    this.conectado = conectado;
    for (const oyente of this.oyentes) oyente(conectado);
  }
}
