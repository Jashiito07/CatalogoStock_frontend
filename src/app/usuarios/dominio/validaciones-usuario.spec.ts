import {
  bytesUtf8,
  esClaveValida,
  esCorreoValido,
  esNombreValido,
  esTelefonoValido,
  MENSAJES_VALIDACION,
  normalizarCorreo,
  normalizarTelefono,
  validarRegistro,
} from './validaciones-usuario';

describe('Validaciones de usuario (contrato de usuarios, RNF-03)', () => {
  describe('nombre', () => {
    it('acepta de 2 a 100 caracteres tras recortar espacios', () => {
      expect(esNombreValido('Al')).toBe(true);
      expect(esNombreValido('  María Zambrano  ')).toBe(true);
      expect(esNombreValido('a'.repeat(100))).toBe(true);
    });

    it('rechaza vacío, un carácter o más de 100', () => {
      expect(esNombreValido('')).toBe(false);
      expect(esNombreValido('   A   ')).toBe(false);
      expect(esNombreValido('a'.repeat(101))).toBe(false);
    });

    it('cuenta caracteres con tilde o emoji como uno', () => {
      expect(esNombreValido('Ñ😀')).toBe(true);
      expect(esNombreValido('😀'.repeat(100))).toBe(true);
    });
  });

  describe('correo', () => {
    it('acepta correos válidos sin importar mayúsculas y espacios', () => {
      expect(esCorreoValido('Maria.Zambrano@correo.com')).toBe(true);
      expect(esCorreoValido('  ana@espam.edu.ec ')).toBe(true);
      expect(normalizarCorreo('  Maria@Correo.COM ')).toBe('maria@correo.com');
    });

    it.each(['', 'maria', 'maria@', 'maria@correo', 'ma ria@correo.com', 'a..b@correo.com', 'a@@b.com'])(
      'rechaza «%s»',
      (correo) => expect(esCorreoValido(correo)).toBe(false),
    );

    it('rechaza más de 254 caracteres', () => {
      expect(esCorreoValido(`${'a'.repeat(64)}@${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(70)}.com`)).toBe(false);
    });
  });

  describe('teléfono (D-14)', () => {
    it('acepta 09XXXXXXXX y +5939XXXXXXXX y normaliza a E.164', () => {
      expect(normalizarTelefono('0991234567')).toBe('+593991234567');
      expect(normalizarTelefono('099 123-4567')).toBe('+593991234567');
      expect(normalizarTelefono('+593 99 123 4567')).toBe('+593991234567');
    });

    it.each(['052123456', '09912345', '09912345678', '+14155552671', '+593521234567', 'abc'])(
      'rechaza «%s» (fijo, longitud o país distinto)',
      (telefono) => expect(esTelefonoValido(telefono)).toBe(false),
    );
  });

  describe('clave (D-08, D-22)', () => {
    it('acepta 8 a 72 caracteres con letras y números', () => {
      expect(esClaveValida('Catalogo2026')).toBe(true);
      expect(esClaveValida('abcdefg1')).toBe(true);
      expect(esClaveValida(`${'a'.repeat(71)}1`)).toBe(true);
    });

    it('rechaza corta, larga, sin letras o sin números', () => {
      expect(esClaveValida('abc1234')).toBe(false);
      expect(esClaveValida(`${'a'.repeat(72)}1`)).toBe(false);
      expect(esClaveValida('12345678')).toBe(false);
      expect(esClaveValida('abcdefgh')).toBe(false);
    });

    it('D-22: rechaza más de 72 bytes en UTF-8 aunque tenga menos de 72 caracteres', () => {
      const clave = `${'ñ'.repeat(36)}1`; // 37 caracteres, 73 bytes
      expect(bytesUtf8(clave)).toBe(73);
      expect(esClaveValida(clave)).toBe(false);
      expect(esClaveValida(`${'ñ'.repeat(35)}1`)).toBe(true);
    });
  });

  describe('formulario de registro', () => {
    const validos = {
      nombre: 'María Zambrano',
      correo: 'maria@correo.com',
      telefono: '0991234567',
      clave: 'Catalogo2026',
      confirmacionClave: 'Catalogo2026',
      aceptaPrivacidad: true,
    };

    it('no devuelve errores con datos válidos', () => {
      expect(validarRegistro(validos)).toEqual({});
    });

    it('RNF-16: exige aceptar el aviso de privacidad', () => {
      expect(validarRegistro({ ...validos, aceptaPrivacidad: false })).toEqual({
        aceptaPrivacidad: MENSAJES_VALIDACION.aceptaPrivacidad,
      });
    });

    it('exige que la confirmación coincida con la clave', () => {
      expect(validarRegistro({ ...validos, confirmacionClave: 'Catalogo2027' })).toEqual({
        confirmacionClave: MENSAJES_VALIDACION.confirmacionClave,
      });
    });

    it('usa los mensajes del contrato', () => {
      const errores = validarRegistro({
        nombre: '',
        correo: 'x',
        telefono: '123',
        clave: 'corta',
        confirmacionClave: 'corta',
        aceptaPrivacidad: true,
      });
      expect(errores).toEqual({
        nombre: 'Ingrese su nombre (2 a 100 caracteres).',
        correo: 'Ingrese un correo válido.',
        telefono: 'Ingrese un celular de Ecuador válido, por ejemplo 0991234567.',
        clave: 'La clave debe tener entre 8 y 72 caracteres, con letras y números.',
      });
    });
  });
});
