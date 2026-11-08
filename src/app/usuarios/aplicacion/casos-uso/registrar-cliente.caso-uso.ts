import { Conectividad } from '../../../compartido/aplicacion/puertos/conectividad.puerto';
import { ErrorSinConexion } from '../../../compartido/dominio/error-api';
import { ErrorDatosFormulario } from '../../dominio/errores';
import { Sesion, Usuario } from '../../dominio/sesion';
import {
  DatosFormularioRegistro,
  normalizarCorreo,
  normalizarTelefono,
  validarRegistro,
} from '../../dominio/validaciones-usuario';
import { ApiUsuarios } from '../puertos/api-usuarios.puerto';
import { IniciarSesion } from './iniciar-sesion.caso-uso';

export type ResultadoRegistro =
  | { readonly tipo: 'sesion-iniciada'; readonly sesion: Sesion }
  /** La cuenta se creó, pero el ingreso automático falló: el Cliente ingresa a mano. */
  | { readonly tipo: 'registrado-sin-sesion'; readonly usuario: Usuario; readonly error: unknown };

/**
 * Registro del Cliente (RF-USU-01, RNF-16, D-11): valida igual que la API, envía el
 * registro con la versión del aviso aceptada y luego ingresa con las mismas
 * credenciales (contrato de usuarios, «App móvil»).
 */
export class RegistrarCliente {
  constructor(
    private readonly api: ApiUsuarios,
    private readonly iniciarSesion: IniciarSesion,
    private readonly conectividad: Conectividad,
  ) {}

  async ejecutar(
    datos: DatosFormularioRegistro,
    versionPrivacidad: string,
  ): Promise<ResultadoRegistro> {
    const errores = validarRegistro(datos);
    if (Object.keys(errores).length > 0) throw new ErrorDatosFormulario(errores);
    if (!(await this.conectividad.estaConectado())) throw new ErrorSinConexion();

    const correo = normalizarCorreo(datos.correo);
    const usuario = await this.api.registrar({
      nombre: datos.nombre.trim(),
      correo,
      // validarRegistro ya garantizó que el teléfono es válido (D-14).
      telefono: normalizarTelefono(datos.telefono) ?? datos.telefono,
      clave: datos.clave,
      aceptaPrivacidad: true,
      versionPrivacidad,
    });

    try {
      const sesion = await this.iniciarSesion.ejecutar({ correo, clave: datos.clave });
      return { tipo: 'sesion-iniciada', sesion };
    } catch (error) {
      return { tipo: 'registrado-sin-sesion', usuario, error };
    }
  }
}
