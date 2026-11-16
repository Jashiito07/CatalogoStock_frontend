import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

import { URL_API } from '../../compartido/compartido.providers';
import { ErrorApi } from '../../compartido/dominio/error-api';
import { convertirErrorHttp } from '../../compartido/infraestructura/error-http';
import { ApiProductos } from '../aplicacion/puertos/api-productos.puerto';
import { ConsultaProductos, PaginaProductos } from '../dominio/consulta';
import { esMarca, Marca } from '../dominio/marca';
import { crearProducto, esProductoRemoto, ImagenProducto, Producto } from '../dominio/producto';

/** Rutas del contrato de productos (relativas a `/api/v1`). */
export const RUTAS_PRODUCTOS = {
  marcas: '/marcas',
  productos: '/productos',
} as const;

function respuestaInvalida(): ErrorApi {
  return new ErrorApi(500, 'ERROR_INTERNO', 'Respuesta inesperada del servidor.');
}

/**
 * Convierte la ruta pública de una imagen (`/api/v1/imagenes/<uuid>.<ext>`, D-46) en una
 * URL completa usando el servidor de la API. Una URL que ya es absoluta se deja igual.
 */
export function resolverUrlImagen(urlApi: string, ruta: string): string {
  if (/^https?:\/\//iu.test(ruta)) return ruta;
  const origen = new URL(urlApi).origin;
  return `${origen}${ruta.startsWith('/') ? '' : '/'}${ruta}`;
}

/** Adaptador HTTP de marcas y productos (docs/contrato-api/productos.md). */
@Injectable({ providedIn: 'root' })
export class ApiProductosHttp implements ApiProductos {
  private readonly http = inject(HttpClient);
  private readonly urlApi = inject(URL_API);

  async listarMarcas(): Promise<readonly Marca[]> {
    const cuerpo = await this.solicitar(
      this.http.get<unknown>(`${this.urlApi}${RUTAS_PRODUCTOS.marcas}`),
    );
    const elementos = elementosDe(cuerpo);
    if (!elementos.every(esMarca)) throw respuestaInvalida();
    return elementos;
  }

  async listarProductos(consulta: ConsultaProductos): Promise<PaginaProductos> {
    let parametros = new HttpParams()
      .set('pagina', consulta.pagina)
      .set('tamanio', consulta.tamanio);
    if (consulta.marcaId) parametros = parametros.set('marcaId', consulta.marcaId);
    if (consulta.busqueda) parametros = parametros.set('busqueda', consulta.busqueda);
    if (consulta.disponibilidad) {
      parametros = parametros.set('disponibilidad', consulta.disponibilidad);
    }
    const cuerpo = await this.solicitar(
      this.http.get<unknown>(`${this.urlApi}${RUTAS_PRODUCTOS.productos}`, {
        params: parametros,
      }),
    );
    return this.leerPagina(cuerpo);
  }

  private leerPagina(cuerpo: unknown): PaginaProductos {
    const elementos = elementosDe(cuerpo);
    const datos = cuerpo as Record<string, unknown>;
    if (
      !elementos.every(esProductoRemoto) ||
      typeof datos['pagina'] !== 'number' ||
      typeof datos['tamanio'] !== 'number' ||
      typeof datos['total'] !== 'number'
    ) {
      throw respuestaInvalida();
    }
    let productos: Producto[];
    try {
      productos = elementos.map((remoto) =>
        crearProducto({
          ...remoto,
          imagenes: remoto.imagenes.map(
            (i): ImagenProducto => ({ ...i, url: resolverUrlImagen(this.urlApi, i.url) }),
          ),
        }),
      );
    } catch {
      // Precio con un formato fuera del contrato.
      throw respuestaInvalida();
    }
    return {
      elementos: productos,
      pagina: datos['pagina'],
      tamanio: datos['tamanio'],
      total: datos['total'],
    };
  }

  private async solicitar(peticion: Observable<unknown>): Promise<unknown> {
    try {
      return await firstValueFrom(peticion, { defaultValue: null });
    } catch (error) {
      throw convertirErrorHttp(error);
    }
  }
}

function elementosDe(cuerpo: unknown): readonly unknown[] {
  if (typeof cuerpo !== 'object' || cuerpo === null) throw respuestaInvalida();
  const elementos = (cuerpo as Record<string, unknown>)['elementos'];
  if (!Array.isArray(elementos)) throw respuestaInvalida();
  return elementos;
}
