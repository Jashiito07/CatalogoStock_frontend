import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

import { URL_API } from '../../compartido/compartido.providers';
import { ErrorApi } from '../../compartido/dominio/error-api';
import { convertirErrorHttp } from '../../compartido/infraestructura/error-http';
import {
  ApiUsuarios,
  AvisoPrivacidad,
  Credenciales,
  SolicitudCambioClave,
  SolicitudRecuperacion,
  SolicitudRegistro,
} from '../aplicacion/puertos/api-usuarios.puerto';
import { esAviso } from '../dominio/aviso-privacidad';
import { esSesion, esUsuario, Sesion, Usuario } from '../dominio/sesion';

/** Rutas del contrato de usuarios (relativas a `/api/v1`). */
export const RUTAS_USUARIOS = {
  registro: '/usuarios/registro',
  ingresoCliente: '/autenticacion/ingreso/cliente',
  renovacion: '/autenticacion/renovacion',
  salida: '/autenticacion/salida',
  yo: '/usuarios/yo',
  avisoPrivacidad: '/privacidad/aviso',
  // recuperacion-clave.md (RF-USU-05).
  recuperacion: '/autenticacion/recuperacion',
  cambioClave: '/usuarios/yo/clave',
} as const;

/** Rutas públicas: nunca llevan el token de acceso ni se renuevan ante un 401. */
export const RUTAS_PUBLICAS: readonly string[] = [
  RUTAS_USUARIOS.registro,
  RUTAS_USUARIOS.ingresoCliente,
  RUTAS_USUARIOS.renovacion,
  RUTAS_USUARIOS.avisoPrivacidad,
  RUTAS_USUARIOS.recuperacion,
];

function respuestaInvalida(): ErrorApi {
  return new ErrorApi(500, 'ERROR_INTERNO', 'Respuesta inesperada del servidor.');
}

/** Adaptador HTTP de la API de usuarios (docs/contrato-api/usuarios.md). */
@Injectable({ providedIn: 'root' })
export class ApiUsuariosHttp implements ApiUsuarios {
  private readonly http = inject(HttpClient);
  private readonly urlApi = inject(URL_API);

  async registrar(solicitud: SolicitudRegistro): Promise<Usuario> {
    const usuario = await this.solicitar(
      this.http.post<unknown>(this.url(RUTAS_USUARIOS.registro), solicitud),
    );
    if (!esUsuario(usuario)) throw respuestaInvalida();
    return usuario;
  }

  async ingresarCliente(credenciales: Credenciales): Promise<Sesion> {
    return this.leerSesion(
      this.http.post<unknown>(this.url(RUTAS_USUARIOS.ingresoCliente), credenciales),
    );
  }

  async renovar(tokenRenovacion: string): Promise<Sesion> {
    return this.leerSesion(
      this.http.post<unknown>(this.url(RUTAS_USUARIOS.renovacion), { tokenRenovacion }),
    );
  }

  async salir(tokenRenovacion: string): Promise<void> {
    await this.solicitar(
      this.http.post<unknown>(this.url(RUTAS_USUARIOS.salida), { tokenRenovacion }),
    );
  }

  async obtenerUsuarioActual(): Promise<Usuario> {
    const usuario = await this.solicitar(this.http.get<unknown>(this.url(RUTAS_USUARIOS.yo)));
    if (!esUsuario(usuario)) throw respuestaInvalida();
    return usuario;
  }

  async obtenerAvisoPrivacidad(): Promise<AvisoPrivacidad> {
    const aviso = await this.solicitar(
      this.http.get<unknown>(this.url(RUTAS_USUARIOS.avisoPrivacidad)),
    );
    if (!esAviso(aviso)) throw respuestaInvalida();
    return {
      version: aviso.version,
      titulo: aviso.titulo,
      contenido: aviso.contenido,
      vigenteDesde: aviso.vigenteDesde,
    };
  }

  async recuperarClave(solicitud: SolicitudRecuperacion): Promise<void> {
    await this.solicitar(
      this.http.post<unknown>(this.url(RUTAS_USUARIOS.recuperacion), solicitud),
    );
  }

  async cambiarClave(solicitud: SolicitudCambioClave): Promise<void> {
    await this.solicitar(this.http.post<unknown>(this.url(RUTAS_USUARIOS.cambioClave), solicitud));
  }

  private url(ruta: string): string {
    return `${this.urlApi}${ruta}`;
  }

  private async leerSesion(peticion: Observable<unknown>): Promise<Sesion> {
    const sesion = await this.solicitar(peticion);
    if (!esSesion(sesion)) throw respuestaInvalida();
    return sesion;
  }

  private async solicitar(peticion: Observable<unknown>): Promise<unknown> {
    try {
      return await firstValueFrom(peticion, { defaultValue: null });
    } catch (error) {
      throw convertirErrorHttp(error);
    }
  }
}
