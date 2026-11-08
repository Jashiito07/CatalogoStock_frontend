import { HttpErrorResponse } from '@angular/common/http';

import { ErrorApi, ErrorSinConexion } from '../dominio/error-api';
import { codigoDeErrorHttp, convertirErrorHttp } from './error-http';

describe('Conversión de errores HTTP (contrato, README)', () => {
  it('estado 0 → sin conexión', () => {
    expect(convertirErrorHttp(new HttpErrorResponse({ status: 0 }))).toBeInstanceOf(ErrorSinConexion);
  });

  it('respuesta con el formato del contrato → ErrorApi con código, mensaje y detalles', () => {
    const error = convertirErrorHttp(
      new HttpErrorResponse({
        status: 429,
        error: { codigo: 'DEMASIADAS_SOLICITUDES', mensaje: 'Espere.', detalles: { reintentarEnSegundos: 42 } },
      }),
    ) as ErrorApi;

    expect(error).toBeInstanceOf(ErrorApi);
    expect(error.codigo).toBe('DEMASIADAS_SOLICITUDES');
    expect(error.message).toBe('Espere.');
    expect(error.reintentarEnSegundos).toBe(42);
  });

  it('respuesta sin formato → código genérico por estado', () => {
    const error = convertirErrorHttp(new HttpErrorResponse({ status: 404, error: 'Not Found' })) as ErrorApi;
    expect(error.codigo).toBe('NO_ENCONTRADO');
    expect((convertirErrorHttp(new HttpErrorResponse({ status: 502 })) as ErrorApi).codigo).toBe('ERROR_INTERNO');
  });

  it('lee el código del contrato de la respuesta', () => {
    expect(
      codigoDeErrorHttp(new HttpErrorResponse({ status: 401, error: { codigo: 'TOKEN_VENCIDO', mensaje: 'x' } })),
    ).toBe('TOKEN_VENCIDO');
    expect(codigoDeErrorHttp(new HttpErrorResponse({ status: 401 }))).toBeNull();
  });

  it('otros errores se devuelven tal cual', () => {
    const original = new TypeError('x');
    expect(convertirErrorHttp(original)).toBe(original);
  });
});
