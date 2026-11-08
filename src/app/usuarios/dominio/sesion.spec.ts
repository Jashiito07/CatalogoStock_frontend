import { SESION_DE_PRUEBA } from '../pruebas/datos-de-prueba';
import { accesoVencido, esSesion, primerNombre } from './sesion';

describe('Sesión (contrato de usuarios, D-09, D-10)', () => {
  it('reconoce una sesión con la forma del contrato', () => {
    expect(esSesion(SESION_DE_PRUEBA)).toBe(true);
  });

  it.each([
    ['nulo', null],
    ['texto', 'sesion'],
    ['sin token de acceso', { ...SESION_DE_PRUEBA, tokenAcceso: '' }],
    ['sin token de renovación', { ...SESION_DE_PRUEBA, tokenRenovacion: undefined }],
    ['con un rol desconocido', { ...SESION_DE_PRUEBA, usuario: { ...SESION_DE_PRUEBA.usuario, rol: 'ADMIN' } }],
    ['sin usuario', { ...SESION_DE_PRUEBA, usuario: null }],
  ])('descarta una sesión guardada %s', (_caso, valor) => {
    expect(esSesion(valor)).toBe(false);
  });

  it('el acceso vence en la fecha indicada o dentro del margen', () => {
    expect(accesoVencido(SESION_DE_PRUEBA, new Date('2026-11-07T10:14:00-05:00'))).toBe(false);
    expect(accesoVencido(SESION_DE_PRUEBA, new Date('2026-11-07T10:15:00-05:00'))).toBe(true);
    expect(accesoVencido(SESION_DE_PRUEBA, new Date('2026-11-07T10:14:00-05:00'), 120_000)).toBe(true);
  });

  it('una fecha ilegible cuenta como vencida', () => {
    expect(accesoVencido({ ...SESION_DE_PRUEBA, venceAccesoEn: 'x' }, new Date())).toBe(true);
  });

  it('obtiene el primer nombre para el saludo', () => {
    expect(primerNombre({ nombre: '  María   Zambrano ' })).toBe('María');
  });
});
