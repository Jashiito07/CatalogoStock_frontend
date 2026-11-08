import { Sesion } from '../dominio/sesion';

/** Datos ficticios para las pruebas unitarias del módulo usuarios. Nunca datos reales. */
export const SESION_DE_PRUEBA: Sesion = {
  tokenAcceso: 'acceso-1',
  venceAccesoEn: '2026-11-07T10:15:00-05:00',
  tokenRenovacion: 'renovacion-1',
  venceRenovacionEn: '2026-11-14T10:00:00-05:00',
  usuario: {
    id: '6f1c2b6e-0000-4000-8000-000000000001',
    nombre: 'María Zambrano',
    correo: 'maria.zambrano@correo.com',
    telefono: '+593991234567',
    rol: 'CLIENTE',
    privacidadAceptadaEn: '2026-11-05T10:15:00-05:00',
    versionPrivacidad: '2026-11-1',
    creadoEn: '2026-11-05T10:15:00-05:00',
  },
};

export const SESION_RENOVADA: Sesion = {
  ...SESION_DE_PRUEBA,
  tokenAcceso: 'acceso-2',
  venceAccesoEn: '2026-11-07T10:30:00-05:00',
  tokenRenovacion: 'renovacion-2',
  venceRenovacionEn: '2026-11-14T10:15:00-05:00',
};
